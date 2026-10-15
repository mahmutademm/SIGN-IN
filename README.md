# Restroom Sign-In

Static site backed by Supabase (project `fomzenfbdtoqwknqtkzi`, free tier).

- `index.html`: student kiosk, installable on an iPad as an app (PWA). Shows a class picker; `index.html?class=8A` opens that class's own sign-in page.
- `out.html`: **Who's out**, the live teacher view. Pick a class to see who is out right now (with minutes), who hasn't signed back in, and who is in class. `out.html?class=8A` opens one class. Installable on a phone or iPad as its own app, "Who's Out" (`teacher.webmanifest`).
- `teacher.html`: teacher log. Filter by date range, class, student, or status (sign-ins, over 30 minutes / not signed back, denied); shows out and back times and minutes; download CSV.
- `assets/teacher.js`, `assets/teacher.css`: shared by the two teacher pages (teacher code, lock screen, trip labels). Both open with the shared teacher code, and stay unlocked while moving between them in the same browser tab.
  The code is never saved on the device: closing the tab or app forgets it, and a teacher page left in the background for 15 minutes locks itself (`LOCK_AFTER_MINUTES` in `assets/teacher.js`).
- `config.js`: Supabase URL and publishable key (safe to be public).
- `manifest.webmanifest`, `sw.js`, `assets/icons/`: what makes the kiosk installable and lets it open without Wi-Fi.

## Signing out and back in

1. A student taps their name and picks **Restroom** or **Hallway**. That time is when they left.
2. When they come back, they tap their name again and then **I'm back**.
3. Students never see how many minutes they were out. The kiosk only says "You're signed out" and "Welcome back".
   Teachers see the minutes on **Who's out** and in the log.
4. If a student hasn't signed back in after **30 minutes**, they show as **Not signed back** (red) on Who's out:
   assume they forgot to sign back in or didn't come back to class. If they do tap back later, the log shows **Back late**.
5. If a student is back in class but forgot to tap, a teacher can press **Mark back in** on Who's out. The log shows
   "Signed back by teacher", and those trips are left out of the average time.

A trip still open at the end of the day stays "Not signed back" in the log, and the student starts fresh the next day.
Sign-ins from before this feature existed (before Oct 15, 2026) show as "Not timed".

## 3-hour rule

A student may go out once every 3 hours, to the restroom or the hallway, at any time of day.
The 3 hours start when they sign out. Another attempt inside that window turns the kiosk screen red,
tells the student when they can go again, and is saved as a **Denied** entry in the teacher log.
Two taps within 2 minutes while still out count as one trip.

The rule runs in the database (`toilet_sign_in`), so reloading the page or using another iPad doesn't get around it.

## Set up a class iPad

1. Open the site in **Safari** on the iPad and tap the class (or go straight to `…/?class=8A`).
2. Tap **Share → Add to Home Screen → Add**. The "Restroom" icon opens full screen, without Safari's bars.
3. Open the app from the home screen once and pick the class. The app reopens on that class from then on;
   "All classes" releases it.
4. Optional, to keep students in the app: **Settings → Accessibility → Guided Access** on, then open the app
   and triple-click the side/home button to lock the iPad to it.

The app reloads itself when the iPad wakes after an hour or more, so roster changes and new versions show up on their own.

## Install Who's Out on a teacher's phone or iPad

1. Open `…/out.html` in **Safari** (iPhone/iPad) or **Chrome** (Android, computer).
2. iPhone/iPad: **Share → Add to Home Screen → Add**. Android/computer: Chrome's menu → **Install app** (or **Add to Home screen**).
3. The "Who's Out" icon opens full screen on the Who's out page; **Log** is one tap away inside the app.
4. It asks for the teacher code every time it is opened fresh, and again after 15 minutes in the background.
   The code is never stored, so a phone or iPad left on a desk doesn't stay open on student data.

Don't install Who's Out on a student kiosk iPad: anyone who can leave the kiosk app could open it (it still asks for the code).

## Database (all prefixed `toilet_`)

| Table | Contents |
|---|---|
| `toilet_students` | email, name, class_name. The roster, readable by the kiosk |
| `toilet_signins` | One row per trip: student_email, class_name, destination (`restroom`/`hallway`), signed_at (left), returned_at and returned_by (`student`/`teacher`), allowed (`false` = denied attempt), timed (`false` for rows from before signing back existed). Not directly readable or writable by the public key |
| `toilet_settings` | bcrypt hash of the teacher code; timezone, minutes between trips (`visit_gap_minutes`), and minutes before "not signed back" (`overdue_minutes`). `school_start`/`school_end` are still there but no longer used |

Kiosk functions: `toilet_status(email)` (is the student out? no times), `toilet_sign_in(email, destination)`, `toilet_sign_back(email)`.
Teacher functions (need the teacher code): `toilet_check_code(code)`, `toilet_teacher_settings(code)`, `toilet_teacher_signins(code, from, to, class)`, `toilet_teacher_sign_back(code, id)`.

## Common tasks (Supabase → SQL Editor)

```sql
-- Change the teacher code
update toilet_settings set value = extensions.crypt('NEW-CODE', extensions.gen_salt('bf')) where key = 'teacher_code_hash';

-- Change the gap between trips (the 3-hour rule), in minutes
update toilet_settings set value = '180' where key = 'visit_gap_minutes';

-- Change how long a student can be out before showing as "not signed back"
update toilet_settings set value = '30' where key = 'overdue_minutes';

-- Add a student / move a student to another class
insert into toilet_students values ('name@edepacademy.org', 'First Last', '8A');
update toilet_students set class_name = '8B' where email = 'name@edepacademy.org';
```

## Hosting

Any static host with HTTPS works (GitHub Pages, Netlify, Cloudflare Pages); the iPad app needs HTTPS. No build step is needed.
For a local test, run `python -m http.server` in this folder and open http://localhost:8000.

`sw.js` loads from the network first and only falls back to its cached copy offline, so a deploy reaches the iPads on their next load.
If you rename or remove a file listed in `sw.js`, update that list too: the service worker won't install if a listed file is missing.

Note: free Supabase projects pause after 7 days with no activity. Daily school use keeps the project active.
