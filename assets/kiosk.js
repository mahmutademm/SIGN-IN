// The student kiosk, shared by index.html (every class), girls-signin.html and boys-signin.html.
// The girls' and boys' pages set SIDE before loading this file; a class belongs to a side by its last letter (8D -> D).
const side = typeof SIDE === "object" ? SIDE : null;
const onSide = c => !side || side.sections.includes(String(c).slice(-1).toUpperCase());
const app = document.getElementById("app");
const overlay = document.getElementById("overlay");
const card = document.getElementById("card");
const esc = s => s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fold = s => s.toLocaleLowerCase("tr").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ı/g, "i");
const clock = d => new Date(d).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
const touch = matchMedia("(pointer: coarse)").matches;
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch {} },
};

// The installed iPad app always reopens on the class it was set to; "All classes" (?pick) releases it.
// Each page remembers its own class, and never opens a class from the other side.
const params = new URLSearchParams(location.search);
const classKey = side ? `kiosk_class_${side.name.toLowerCase()}` : "kiosk_class";
let cls = params.get("class");
if (cls && !onSide(cls)) { cls = null; history.replaceState(null, "", location.pathname); }
if (params.has("pick")) store.set(classKey, null);
else if (cls) store.set(classKey, cls);
else if ((cls = store.get(classKey)) && onSide(cls)) history.replaceState(null, "", `?class=${encodeURIComponent(cls)}`);
else cls = null;

async function showClassPicker() {
  const rows = await db.select("toilet_students?select=class_name");
  const counts = {};
  rows.forEach(r => counts[r.class_name] = (counts[r.class_name] || 0) + 1);
  const names = Object.keys(counts).filter(onSide).sort();
  app.innerHTML = `
    <h1>Choose your class</h1>
    <p class="sub">Tap your class to open its sign-in page.</p>
    <div class="classes">${names.map(c =>
      `<a href="?class=${encodeURIComponent(c)}">${esc(c)}<span>${counts[c]} students</span></a>`).join("")}</div>`;
}

async function showClass() {
  const students = await db.select(
    `toilet_students?select=email,name&class_name=eq.${encodeURIComponent(cls)}&order=name`);
  document.title = `${cls} · Restroom Sign-In`;
  app.innerHTML = `
    <header><h1>Class ${esc(cls)}</h1><a class="back" href="?pick">${side ? `All ${esc(side.name.toLowerCase())}' classes` : "All classes"}</a></header>
    <p class="sub">Tap your name to sign out. Tap it again when you come back.</p>
    <input type="search" id="q" placeholder="Search your name or email" autocomplete="off" aria-label="Search">
    <ul class="list" id="list"></ul>`;
  const q = document.getElementById("q");
  const list = document.getElementById("list");
  const render = () => {
    const term = fold(q.value.trim());
    const hits = students.filter(s => !term || fold(s.name).includes(term) || s.email.includes(term));
    list.innerHTML = hits.length
      ? hits.map(s => `<li><button data-email="${esc(s.email)}">${esc(s.name)}<small>${esc(s.email)}</small></button></li>`).join("")
      : `<li class="empty">No student in ${esc(cls)} matches "${esc(q.value)}".</li>`;
  };
  q.addEventListener("input", render);
  list.addEventListener("click", e => {
    const b = e.target.closest("button[data-email]");
    if (b) openStudent(students.find(s => s.email === b.dataset.email));
  });
  render();
  if (!students.length) list.innerHTML = `<li class="empty">No class called "${esc(cls)}". <a href="?pick">Pick a class</a>.</li>`;
}

let resetTimer;
let tap = 0;   // bumped on every open/close, so a slow answer can't fill in a card that was already closed
function closeOverlay() {
  clearTimeout(resetTimer);
  tap++;
  overlay.classList.remove("open", "denied");
  const q = document.getElementById("q");
  // On the iPad, focusing would pop the keyboard over the name list after every sign-in.
  if (q) { q.value = ""; q.dispatchEvent(new Event("input")); if (!touch) q.focus(); }
}

function showDenied(res) {
  overlay.classList.add("denied");
  card.innerHTML = `
    <div class="stop" aria-hidden="true">✕</div>
    <h2>You can't go out right now</h2>
    <p>${esc(res.name)}, you already went out at ${clock(res.last_at)}.<br>You can go again at ${clock(res.next_at)}.</p>
    <p class="small">This was recorded for your teacher. If it's an emergency, ask your teacher.</p>
    <div class="actions"><button class="primary" id="ok">OK</button></div>`;
  document.getElementById("ok").onclick = closeOverlay;
  resetTimer = setTimeout(closeOverlay, 10000);
}

// Tapping a name asks the server whether the student is out: if not, they pick where they're going;
// if so, they sign back in. Students never see how long they were out; only teachers do.
async function openStudent(s) {
  const mine = ++tap;
  card.innerHTML = `<h2>${esc(s.name)}</h2><p>${esc(s.email)}</p><p class="wait">One moment…</p>`;
  overlay.classList.add("open");
  try {
    const st = await db.rpc("toilet_status", { p_email: s.email });
    if (mine === tap) st.out ? askBack(s) : askWhere(s);
  } catch (err) {
    if (mine === tap) showError("Couldn't load", err);
  }
}

function askWhere(s) {
  card.innerHTML = `
    <h2>${esc(s.name)}</h2>
    <p>${esc(s.email)}</p>
    <p class="ask">Where are you going?</p>
    <div class="where">
      <button data-dest="restroom">Restroom</button>
      <button data-dest="hallway">Hallway</button>
    </div>
    <div class="actions"><button id="cancel">Cancel</button></div>`;
  document.getElementById("cancel").onclick = closeOverlay;
  card.querySelectorAll("[data-dest]").forEach(b => b.onclick = () => signOut(s, b.dataset.dest));
  card.querySelector("[data-dest]").focus();
}

async function signOut(s, dest) {
  const mine = tap;
  card.querySelectorAll("button").forEach(b => b.disabled = true);
  try {
    const res = await db.rpc("toilet_sign_in", { p_email: s.email, p_destination: dest });
    if (mine !== tap) return;
    if (res.allowed === false) return showDenied(res);
    showDone("You're signed out", `${esc(res.name)} · ${res.destination === "hallway" ? "Hallway" : "Restroom"} · ${clock(res.signed_at)}`
      + `${res.duplicate ? "<br>(you were already signed out a moment ago)" : ""}<br><br>Tap your name again when you come back.`, 6000);
  } catch (err) {
    if (mine === tap) showError("Couldn't sign out", err);
  }
}

function askBack(s) {
  card.innerHTML = `
    <h2>${esc(s.name)}</h2>
    <p>${esc(s.email)}</p>
    <p class="ask">Back in class?</p>
    <div class="actions">
      <button id="cancel">Cancel</button>
      <button class="primary" id="back">I'm back</button>
    </div>`;
  document.getElementById("cancel").onclick = closeOverlay;
  document.getElementById("back").focus();
  document.getElementById("back").onclick = async (ev) => {
    const mine = tap;
    ev.target.disabled = true;
    try {
      const res = await db.rpc("toilet_sign_back", { p_email: s.email });
      if (mine === tap) showDone("Welcome back", esc(res.name), 3000);
    } catch (err) {
      if (mine === tap) showError("Couldn't sign back in", err);
    }
  };
}

function showDone(title, body, ms) {
  card.innerHTML = `
    <div class="done" aria-hidden="true">✓</div>
    <h2>${title}</h2>
    <p>${body}</p>
    <div class="actions"><button class="primary" id="ok">Done</button></div>`;
  document.getElementById("ok").onclick = closeOverlay;
  resetTimer = setTimeout(closeOverlay, ms);
}

function showError(title, err) {
  card.innerHTML = `<h2 class="err">${title}</h2><p>${esc(why(err))}. Please tell your teacher.</p>
    <div class="actions"><button class="primary" id="ok">Close</button></div>`;
  document.getElementById("ok").onclick = closeOverlay;
}
overlay.addEventListener("click", e => { if (e.target === overlay) closeOverlay(); });
document.addEventListener("keydown", e => { if (e.key === "Escape") closeOverlay(); });

// fetch() throws a TypeError ("Load failed" on iPad) when there is no connection.
function why(err) { return err instanceof TypeError ? "The iPad has no internet connection" : err.message; }

(cls ? showClass() : showClassPicker()).catch(err => {
  app.innerHTML = `<h1>Restroom Sign-In</h1><p class="err">Couldn't load: ${esc(why(err))}.</p>
    <div class="actions"><button class="primary" onclick="location.reload()">Try again</button></div>`;
  addEventListener("online", () => location.reload());
});

// An installed iPad app resumes instead of reloading. Reload when it wakes after an hour or more
// so the roster and any new version of the app are picked up.
const loadedAt = Date.now();
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && Date.now() - loadedAt > 3600e3 && !overlay.classList.contains("open")) location.reload();
});

if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js");
