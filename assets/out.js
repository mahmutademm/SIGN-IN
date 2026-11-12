// The Who's Out board, shared by out.html (every class), girls.html and boys.html.
// girls.html and boys.html set SIDE before loading this file; a class belongs to a side by its last letter (8D -> D).
const side = typeof SIDE === "object" ? SIDE : null;
const onSide = c => !side || side.sections.includes(String(c).slice(-1).toUpperCase());
// The Log's "Who's out" link returns to the board this tab came from.
store.set("board", location.pathname.split("/").pop() || "out.html");

let roster = [];
let trips = [];   // today's sign-ins for every class on this board, newest first
let cls = new URLSearchParams(location.search).get("class") || "";

async function showBoard() {
  roster = (await db.select("toilet_students?select=email,name,class_name&order=name")).filter(s => onSide(s.class_name));
  if (!roster.some(s => s.class_name === cls)) cls = "";
  app.innerHTML = `
    <div class="head"><h1>Who's out${side ? ` · ${esc(side.name)}` : ""}</h1><span class="updated" id="updated" aria-live="polite"></span></div>
    <div class="classes" id="classes" role="group" aria-label="Class"></div>
    <p class="now" id="now" hidden></p>
    <div id="board"></div>`;
  $("classes").addEventListener("click", e => {
    const b = e.target.closest("[data-class]");
    if (!b) return;
    cls = b.dataset.class;
    history.replaceState(null, "", cls ? `?class=${encodeURIComponent(cls)}` : location.pathname);
    render();
  });
  $("board").addEventListener("click", e => {
    const b = e.target.closest("[data-back]");
    if (b) signBack(b);
  });
  await load();
  refreshTimer = setInterval(load, 15000);
}

async function load() {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end = new Date(start); end.setDate(start.getDate() + 1);
  try {
    trips = (await db.rpc("toilet_teacher_signins", {
      p_code: code, p_from: start.toISOString(), p_to: end.toISOString(), p_class: null,
    })).filter(r => onSide(r.class_name));
    if (!$("board")) return;   // locked while loading
    render();
    $("updated").textContent = `Updated ${clock(new Date())}`;
  } catch (err) {
    if (!lockIfCodeChanged(err) && $("updated")) $("updated").innerHTML = `<span class="err">Couldn't refresh: ${esc(why(err))}</span>`;
  }
}

// A teacher signs a student back in: they're in class but forgot to tap their name.
async function signBack(b) {
  b.disabled = true;
  try {
    await db.rpc("toilet_teacher_sign_back", { p_code: code, p_id: Number(b.dataset.back) });
    await load();
  } catch (err) {
    b.disabled = false;
    if (!lockIfCodeChanged(err)) $("updated").innerHTML = `<span class="err">Couldn't sign back in: ${esc(why(err))}</span>`;
  }
}

function render() {
  const now = Date.now();
  const limit = overdueMinutes();
  // A student's latest trip today decides whether they're out now; trips are newest first.
  const latest = new Map();
  trips.forEach(r => { if (r.allowed && r.timed && !latest.has(r.student_email)) latest.set(r.student_email, r); });
  const outAll = [...latest.values()].filter(r => !r.returned_at)
    .sort((a, b) => new Date(a.signed_at) - new Date(b.signed_at));
  const inView = r => !cls || r.class_name === cls;
  const out = outAll.filter(inView);
  const missing = out.filter(r => tripStatus(r, now) === "missing");
  const away = out.filter(r => tripStatus(r, now) === "out");
  const students = roster.filter(inView);
  const outEmails = new Set(out.map(r => r.student_email));
  const inClass = students.filter(s => !outEmails.has(s.email));

  const classes = [...new Set(roster.map(s => s.class_name))].sort();
  $("classes").innerHTML = ["", ...classes].map(c => {
    const o = outAll.filter(r => !c || r.class_name === c);
    const late = o.some(r => tripStatus(r, now) === "missing");
    return `<button data-class="${esc(c)}" aria-pressed="${c === cls}">${c ? esc(c) : side ? `All ${esc(side.name.toLowerCase())}` : "All classes"}${o.length
      ? `<span class="count${late ? " missing" : ""}" title="${o.length} out">${o.length}</span>` : ""}</button>`;
  }).join("");

  const card = r => {
    const st = tripStatus(r, now);
    const m = minutesBetween(r.signed_at, now);
    return `<article class="trip ${st}">
      <div class="who"><span class="name">${esc(r.student_name)}</span><span class="pill">${esc(r.class_name)}</span></div>
      <div class="where">${PLACE[r.destination] || esc(r.destination)} · left at ${clock(r.signed_at)}</div>
      ${lessonLine(r)}
      <div class="time"><span class="min">${fmtMinutes(m)}</span>
        <button data-back="${r.id}" title="They're back in class but forgot to tap their name">Mark back in</button></div>
      ${st === "out" ? `<div class="bar" aria-hidden="true"><i style="width:${Math.min(100, m / limit * 100)}%"></i></div>` : ""}
    </article>`;
  };

  // Today's trips per student, for the in-class list.
  const today = new Map();
  trips.forEach(r => {
    if (!r.allowed || !r.timed) return;
    const t = today.get(r.student_email) || { n: 0, min: 0, late: 0 };
    const st = tripStatus(r, now);
    t.n++;
    if (st === "back" || st === "late") t.min += tripMinutes(r, now);
    if (st === "late" || st === "missing" || st === "teacher") t.late++;
    today.set(r.student_email, t);
  });
  const summary = s => {
    const t = today.get(s.email);
    if (!t) return "No trips today";
    return `${t.n} ${t.n === 1 ? "trip" : "trips"}${t.min ? ` · ${fmtMinutes(t.min)}` : ""}${t.late
      ? ` · <span class="late">${t.late} not back in ${limit} min</span>` : ""}`;
  };

  // The selected class's lesson right now.
  const slot = cls && Schedule.at(cls);
  $("now").hidden = !slot;
  if (slot) $("now").innerHTML = `<b>${esc(cls)} now:</b> ${esc(Schedule.describe(slot))} <small>· ${esc(slot.time)}</small>`;

  $("board").innerHTML = `
    <section>
      <h2>Not signed back <small>· out ${limit}+ minutes, should be in class</small></h2>
      ${missing.length ? `<div class="cards">${missing.map(card).join("")}</div>`
        : `<p class="empty">Nobody has been out longer than ${limit} minutes.</p>`}
    </section>
    <section>
      <h2>Out now</h2>
      ${away.length ? `<div class="cards">${away.map(card).join("")}</div>` : `<p class="empty">Nobody is out right now.</p>`}
    </section>
    <section>
      <h2>In class${cls ? ` · ${esc(cls)}` : ""}</h2>
      ${cls ? `<ul class="inclass">${inClass.map(s => `<li>${esc(s.name)}<small>${summary(s)}</small></li>`).join("")}</ul>`
        : `<p class="empty">Pick a class above to see each student in it.</p>`}
    </section>`;
}

teacherPage(showBoard);

// Timers pause while the app or tab is in the background, so refresh as soon as it's back on screen.
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && $("board")) load();
});

if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js");
