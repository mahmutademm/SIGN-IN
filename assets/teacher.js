// Shared by the teacher pages (out.html, teacher.html): the teacher code, the lock screen, and how trips are labeled.
// Expects #app, #brand and #logout on the page, and config.js loaded first.
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const clock = d => new Date(d).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
const store = {
  get(k) { try { return sessionStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { v == null ? sessionStorage.removeItem(k) : sessionStorage.setItem(k, v); } catch {} },
};
const app = $("app");
const brand = $("brand");
// The code is kept for this browser tab only, so moving between the teacher pages stays unlocked.
let code = store.get("teacher_code");
let rules = {};   // school_start, school_end, visit_gap_minutes, overdue_minutes (toilet_teacher_settings)
let refreshTimer;
let startPage;

// fetch() throws a TypeError ("Load failed" on iPhone) when there is no connection.
const why = err => err instanceof TypeError ? "No internet connection" : err.message;

// A teacher page left in the background this long locks itself, so a phone or iPad left alone (or the
// installed Who's Out app reopened later) asks for the teacher code again. Reloading also picks up new versions.
const LOCK_AFTER_MINUTES = 15;
let hiddenAt = 0;
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") { hiddenAt = Date.now(); return; }
  if (code && hiddenAt && Date.now() - hiddenAt > LOCK_AFTER_MINUTES * 60000) {
    code = null; store.set("teacher_code", null); location.reload();
  }
});

function teacherPage(start) {
  startPage = () => db.rpc("toilet_teacher_settings", { p_code: code })
    .then(r => { rules = r || {}; brand.hidden = false; return start(); })
    .catch(err => lockIfCodeChanged(err) || showLogin(why(err)));
  $("logout").onclick = () => { code = null; store.set("teacher_code", null); showLogin(); };
  code ? startPage() : showLogin();
}

function showLogin(msg = "") {
  clearInterval(refreshTimer);
  brand.hidden = true;
  app.innerHTML = `
    <div class="login">
      <img src="assets/edep-logo-light.png" alt="Edep Academy">
      <h1>${esc(document.title)}</h1>
      <form id="f">
        <label for="c" class="muted">Teacher code</label>
        <input id="c" type="password" autocomplete="current-password" required autofocus>
        <button class="primary">Open</button>
        <p class="err" role="alert">${esc(msg)}</p>
      </form>
    </div>`;
  $("f").onsubmit = async e => {
    e.preventDefault();
    const c = $("c").value;
    try {
      if (!(await db.rpc("toilet_check_code", { p_code: c }))) return showLogin("That code is not right.");
      code = c; store.set("teacher_code", c); startPage();
    } catch (err) { showLogin(why(err)); }
  };
}

// The teacher code was changed in the database: lock the page. Returns whether it did.
function lockIfCodeChanged(err) {
  if (!/teacher code/i.test(err.message)) return false;
  showLogin("Teacher code changed. Enter the new one.");
  return true;
}

const PLACE = { restroom: "Restroom", hallway: "Hallway" };
const overdueMinutes = () => Number(rules.overdue_minutes) || 30;
const minutesBetween = (from, to) => Math.floor((new Date(to) - new Date(from)) / 60000);
const fmtMinutes = m => m < 1 ? "<1 min" : `${m} min`;

// Where a trip stands. Untimed rows were logged before students signed back in, so they have no return time.
// Out past the overdue limit without signing back counts as "missing": assume they forgot or didn't come back.
function tripStatus(r, now = Date.now()) {
  if (!r.allowed) return "denied";
  if (!r.timed) return "untimed";
  if (!r.returned_at) return minutesBetween(r.signed_at, now) >= overdueMinutes() ? "missing" : "out";
  if (r.returned_by === "teacher") return "teacher";
  return minutesBetween(r.signed_at, r.returned_at) >= overdueMinutes() ? "late" : "back";
}

const STATUS = {
  denied: ["Denied", "denied"],
  untimed: ["Not timed", "quiet"],
  out: ["Out now", ""],
  missing: ["Not signed back", "denied"],
  back: ["Back", "quiet"],
  late: ["Back late", "warn"],
  teacher: ["Signed back by teacher", "quiet"],
};
const statusPill = st => `<span class="pill ${STATUS[st][1]}">${STATUS[st][0]}</span>`;

// Minutes out: until the student signed back, or so far for a trip still open today. null when unknown.
function tripMinutes(r, now = Date.now()) {
  if (!r.allowed || !r.timed) return null;
  if (r.returned_at) return minutesBetween(r.signed_at, r.returned_at);
  return ymd(new Date(r.signed_at)) === ymd(new Date(now)) ? minutesBetween(r.signed_at, now) : null;
}
