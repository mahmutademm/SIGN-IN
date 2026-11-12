// Which class has which teacher at a given moment. Loaded by the kiosk and the teacher pages.
// Bell times are the current bell schedule (Nov 2026); the lessons come from the class timetables (Classes.pdf).
//
// Two bell schedules alternate between the sides (a class's side is its last letter: A, B, C boys; D, E, F girls):
//   Bell Schedule 1: Mon/Wed boys, Tue/Thu girls. Lunch and prayer come before 6th period.
//   Bell Schedule 2: Mon/Wed girls, Tue/Thu boys. 6th period comes before lunch and prayer.
//   Friday: one schedule for everyone.
// A sign-out in the few minutes between two periods counts toward the period that is starting.
(() => {
  const BELL_1 = [
    ["Arrival", "8:20", "8:40"],
    [1, "8:40", "9:20"],
    [2, "9:25", "10:07"],
    [3, "10:12", "10:54"],
    [4, "10:59", "11:36"],
    [5, "11:39", "12:18"],
    ["Lunch", "12:21", "12:51"],
    ["Prayer", "12:51", "13:20"],
    [6, "13:20", "14:00"],
    [7, "14:05", "14:45"],
    [8, "14:48", "15:24"],
    ["Club time", "15:30", "16:20"],
  ];
  const BELL_2 = [
    ["Arrival", "8:20", "8:40"],
    [1, "8:40", "9:20"],
    [2, "9:25", "10:07"],
    [3, "10:12", "10:54"],
    [4, "10:59", "11:36"],
    [5, "11:39", "12:18"],
    [6, "12:21", "13:01"],
    ["Lunch", "13:01", "13:31"],
    ["Prayer", "13:31", "14:00"],
    [7, "14:05", "14:45"],
    [8, "14:48", "15:24"],
    ["Club time", "15:30", "16:20"],
  ];
  const BELL_FRIDAY = [
    ["Arrival", "8:20", "8:35"],
    [1, "8:35", "9:10"],
    [2, "9:13", "9:48"],
    [3, "9:51", "10:30"],
    [4, "10:35", "11:15"],
    [5, "11:20", "12:00"],
    [6, "12:05", "12:45"],
    ["Lunch", "12:50", "13:15"],
    ["Prayer", "13:20", "14:00"],
    [7, "14:05", "14:45"],
    [8, "14:48", "15:24"],
  ];
  const BOYS = "ABC";

  // Short names used in the timetable below -> the teacher's full name.
  const TEACHERS = {
    Ayyad: "Wafa Ayyad",
    Yusuf: "Yusuf Batman",
    Quran: "Saliha Durmaz / Ajaz Khan",
    Gurcanli: "Ayse Gurcanli",
    Hansa: "Hansa Sen",
    Semih: "Semih Nazli",
    Zhyldyz: "Zhyldyz Makhmutova",
    AliK: "Ali Keser / Hayati Aysu",
    Halil: "Halil Topal",
    OE: "Emine Odabasi",
    Ozkan: "Leyla Ozkan",
    Ziynet: "Ziynet Akca",
    Urfan: "Muhammed Urfan",
    SY: "Yunus Sarikaya",
  };

  // Each class, each day: periods 1 to 8 as "Subject/Teacher/Room" (the teacher is a key of TEACHERS).
  const TIMETABLE = {
  "8A": {
    Mon: ["ELA/Ayyad/320", "Quran/AliK/314-312", "Science/Semih/313", "Arabic/Ziynet/313", "Arabic/Ziynet/313", "Quran/AliK/314-312", "Faith/Yusuf/311", "Faith/Yusuf/311"],
    Tue: ["Essentials/Yusuf/313", "Gym/Urfan/", "Gym/Urfan/", "Science/Semih/311", "Math/Hansa/311", "Terms/SY/313", "Quran/AliK/314-312", "Quran/AliK/314-312"],
    Wed: ["Science/Semih/313", "ELA/Ayyad/320", "ELA/Ayyad/320", "Turkish/OE/314", "Math/Hansa/311", "Math/Hansa/311", "Quran/AliK/311-312", "Quran/AliK/311-312"],
    Thu: ["ELA/Ayyad/320", "ELA/Ayyad/320", "Quran/AliK/314-312", "History/Halil/313", "Narrations/Yusuf/313", "Turkish/OE/314", "Math/Hansa/311", "Quran/AliK/311-312"],
    Fri: ["Faith/Yusuf/313", "Quran/AliK/314-312", "Essentials/Yusuf/313", "Science/Semih/311", "History/Halil/313", "Narrations/Yusuf/313", "Math/Hansa/311", "Quran/AliK/311-312"],
  },
  "8B": {
    Mon: ["Faith/Yusuf/311", "Faith/Yusuf/311", "Quran/AliK/314-312", "Quran/AliK/314-312", "Math/Hansa/311", "Math/Hansa/311", "Arabic/Ziynet/313", "Arabic/Ziynet/313"],
    Tue: ["Science/Semih/311", "Quran/AliK/314-312", "Quran/AliK/314-312", "History/Halil/313", "Narrations/Yusuf/313", "Math/Hansa/311", "Essentials/Yusuf/313", "Terms/SY/311"],
    Wed: ["Quran/AliK/314-312", "Gym/Urfan/", "Gym/Urfan/", "History/Halil/313", "Science/Semih/313", "Quran/AliK/314-312", "ELA/Ayyad/320", "Narrations/Yusuf/313"],
    Thu: ["Quran/AliK/314-312", "Faith/Yusuf/313", "Science/Semih/311", "Quran/AliK/311-312", "Math/Hansa/311", "ELA/Ayyad/320", "ELA/Ayyad/320", "Turkish/OE/314"],
    Fri: ["Math/Hansa/311", "ELA/Ayyad/320", "ELA/Ayyad/320", "Essentials/Yusuf/313", "Science/Semih/312", "Quran/AliK/314-312", "Quran/AliK/314-312", "Turkish/OE/314"],
  },
  "8C": {
    Mon: ["Arabic/Ziynet/313", "Arabic/Ziynet/313", "Faith/Yusuf/311", "Faith/Yusuf/311", "Science/Semih/312", "Essentials/Yusuf/313", "Quran/AliK/314-312", "Quran/AliK/314-312"],
    Tue: ["ELA/Ayyad/320", "ELA/Ayyad/320", "Narrations/Yusuf/313", "Quran/AliK/314-312", "Science/Semih/312", "Quran/AliK/314-312", "Math/Hansa/311", "Faith/Yusuf/313"],
    Wed: ["Math/Hansa/311", "Science/Semih/313", "Quran/AliK/311-312", "Quran/AliK/311-312", "ELA/Ayyad/320", "ELA/Ayyad/320", "Essentials/Yusuf/313", "Turkish/OE/314"],
    Thu: ["Math/Hansa/311", "Gym/Urfan/", "Gym/Urfan/", "Turkish/OE/314", "Quran/AliK/314-312", "Narrations/Yusuf/313", "Quran/AliK/314-312", "History/Halil/313"],
    Fri: ["Quran/AliK/314-312", "Science/Semih/311", "Quran/AliK/314-312", "Terms/SY/312", "Math/Hansa/311", "Math/Hansa/311", "ELA/Ayyad/320", "History/Halil/313"],
  },
  "8D": {
    Mon: ["Science/Semih/327", "Narrations/Gurcanli/321", "Math/Hansa/324", "Quran/Quran/321-323", "ELA/Ayyad/320", "ELA/Ayyad/320", "Essentials/Gurcanli/321", "Quran/Quran/321-323"],
    Tue: ["Quran/Quran/321-323", "Quran/Quran/321-323", "Math/Hansa/324", "Narrations/Gurcanli/327", "History/Halil/334", "ELA/Ayyad/320", "ELA/Ayyad/320", "Terms/Gurcanli/327"],
    Wed: ["Quran/Quran/321-323", "Quran/Quran/321-323", "Faith/Yusuf/", "Faith/Yusuf/", "Essentials/Gurcanli/327", "Terms/Gurcanli/327", "Math/Hansa/324", "Seerah/Halil/334"],
    Thu: ["Faith/Yusuf/327", "Math/Hansa/324", "Math/Hansa/324", "Science/Semih/324", "Arabic/Ozkan/323", "Arabic/Ozkan/323", "Quran/Quran/321-323", "Quran/Quran/321-323"],
    Fri: ["ELA/Ayyad/320", "Quran/Quran/321-323", "Science/Semih/323", "Seerah/Halil/334", "Gym/Zhyldyz/", "Gym/Zhyldyz/", "History/Halil/334", "Quran/Quran/321-323"],
  },
  "8E": {
    Mon: ["Quran/Quran/321-323", "ELA/Ayyad/320", "ELA/Ayyad/320", "Science/Semih/324", "Narrations/Gurcanli/327", "Quran/Quran/321-323", "Math/Hansa/324", "Seerah/Halil/334"],
    Tue: ["Essentials/Gurcanli/327", "Math/Hansa/324", "Quran/Quran/321-323", "Quran/Quran/321-323", "Terms/Gurcanli/321", "Faith/Yusuf/323", "Narrations/Gurcanli/327", "Seerah/Halil/334"],
    Wed: ["ELA/Ayyad/320", "Math/Hansa/324", "Math/Hansa/324", "Essentials/Gurcanli/327", "History/Halil/334", "Quran/Quran/321-323", "Terms/Gurcanli/321", "Quran/Quran/321-323"],
    Thu: ["Science/Semih/324", "Quran/Quran/321-323", "Quran/Quran/321-323", "ELA/Ayyad/320", "ELA/Ayyad/320", "History/Halil/334", "Arabic/Ozkan/324", "Arabic/Ozkan/324"],
    Fri: ["Science/Semih/324", "Math/Hansa/324", "Gym/Zhyldyz/", "Gym/Zhyldyz/", "Quran/Quran/321-323", "Quran/Quran/321-323", "Faith/Yusuf/327", "Faith/Yusuf/327"],
  },
  "8F": {
    Mon: ["Math/Hansa/324", "Math/Hansa/324", "Quran/Quran/321-323", "Seerah/Halil/334", "Quran/Quran/321-323", "Terms/Gurcanli/327", "ELA/Ayyad/320", "Narrations/Gurcanli/327"],
    Tue: ["Math/Hansa/324", "Essentials/Gurcanli/327", "Science/Semih/327", "ELA/Ayyad/320", "ELA/Ayyad/320", "History/Halil/334", "Quran/Quran/321-323", "Quran/Quran/321-323"],
    Wed: ["Essentials/Gurcanli/327", "Terms/Gurcanli/327", "Science/Semih/323", "Quran/Quran/321-323", "Quran/Quran/321-323", "Seerah/Halil/334", "History/Halil/334", "Narrations/Gurcanli/327"],
    Thu: ["Quran/Quran/321-323", "Arabic/Ozkan/327", "Arabic/Ozkan/327", "Quran/Quran/321-323", "Science/Semih/324", "Math/Hansa/324", "Faith/Yusuf/327", "Faith/Yusuf/327"],
    Fri: ["Quran/Quran/321-323", "Faith/Yusuf/327", "Math/Hansa/324", "Quran/Quran/321-323", "ELA/Ayyad/320", "ELA/Ayyad/320", "Gym/Zhyldyz/", "Gym/Zhyldyz/"],
  },
  };

  const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const mins = hm => { const [h, m] = hm.split(":").map(Number); return h * 60 + m; };
  const hm = m => `${(Math.floor(m / 60) + 11) % 12 + 1}:${String(m % 60).padStart(2, "0")}`;
  const ordinal = n => n + (["th", "st", "nd", "rd"][n] || "th");

  function bellFor(cls, day) {
    if (day === 5) return BELL_FRIDAY;
    if (day < 1 || day > 4) return null;
    const boys = BOYS.includes(String(cls).slice(-1).toUpperCase());
    return (day === 1 || day === 3) === boys ? BELL_1 : BELL_2;
  }

  // What `cls` has at `when`: { period, label, subject, teacher, teacherKey, room, time }, or null outside the school day.
  // `period` is null for arrival, lunch, prayer and club time (no teacher).
  function at(cls, when = new Date()) {
    const d = new Date(when);
    const bell = bellFor(cls, d.getDay());
    if (!bell) return null;
    const t = d.getHours() * 60 + d.getMinutes();
    const block = bell.find(([, , end]) => t < mins(end));
    if (!block || t < mins(bell[0][1])) return null;
    const [what, start, end] = block;
    // Between periods (e.g. 9:20-9:25) the block that is starting is returned; the gap before club time is not school time.
    if (t < mins(start) && what === "Club time") return null;
    const slot = { label: typeof what === "number" ? `${ordinal(what)} period` : what, period: null,
      subject: "", teacher: "", teacherKey: "", room: "", time: `${hm(mins(start))}–${hm(mins(end))}` };
    if (typeof what !== "number") return slot;
    slot.period = what;
    const lesson = TIMETABLE[cls]?.[DAYS[d.getDay()]]?.[what - 1];
    if (lesson) {
      const [subject, key, room] = lesson.split("/");
      Object.assign(slot, { subject, teacherKey: key, teacher: TEACHERS[key] || key, room });
    }
    return slot;
  }

  // One line for the screen: "3rd period · Science · Semih Nazli".
  function describe(slot) {
    if (!slot) return "";
    return [slot.label, slot.subject, slot.teacher].filter(Boolean).join(" · ");
  }

  window.Schedule = { at, describe, TEACHERS };
})();
