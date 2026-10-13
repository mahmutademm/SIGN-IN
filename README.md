# Restroom Sign-In

Static site backed by Supabase (project `fomzenfbdtoqwknqtkzi`, free tier).

- `index.html`: student kiosk, installable on an iPad as an app (PWA). Shows a class picker; `index.html?class=8A` opens that class's own sign-in page.
- `teacher.html`: teacher log, unlocked with the shared teacher code. Filter by date range, class, student, or status (signed in / denied); download CSV.
- `config.js`: Supabase URL and publishable key (safe to be public).
- `manifest.webmanifest`, `sw.js`, `assets/icons/`: what makes the kiosk installable and lets it open without Wi-Fi.

## Restroom rule

During school hours (8:30 AM – 3:30 PM, New York time) a student may go once every 3 hours.
A second attempt inside that window turns the kiosk screen red, tells the student when they can go again,
and is saved as a **Denied** entry in the teacher log. Outside school hours there is no limit.
Only visits made during today's school hours count, and two taps within 2 minutes count as one visit.

The rule runs in the database (`toilet_sign_in`), so reloading the page or using another iPad doesn't get around it.

## Set up a class iPad

1. Open the site in **Safari** on the iPad and tap the class (or go straight to `…/?class=8A`).
2. Tap **Share → Add to Home Screen → Add**. The "Restroom" icon opens full screen, without Safari's bars.
3. Open the app from the home screen once and pick the class. The app reopens on that class from then on;
   "All classes" releases it.
4. Optional, to keep students in the app: **Settings → Accessibility → Guided Access** on, then open the app
   and triple-click the side/home button to lock the iPad to it.

The app reloads itself when the iPad wakes after an hour or more, so roster changes and new versions show up on their own.

## Database (all prefixed `toilet_`)

| Table | Contents |
|---|---|
| `toilet_students` | email, name, class_name. The roster, readable by the kiosk |
| `toilet_signins` | student_email, class_name, signed_at, allowed (`false` = denied attempt). Not directly readable or writable by the public key |
| `toilet_settings` | bcrypt hash of the teacher code; school hours, timezone, and minutes between visits |

Functions: `toilet_sign_in(email)`, `toilet_check_code(code)`, `toilet_teacher_signins(code, from, to, class)`.

## Common tasks (Supabase → SQL Editor)

```sql
-- Change the teacher code
update toilet_settings set value = extensions.crypt('NEW-CODE', extensions.gen_salt('bf')) where key = 'teacher_code_hash';

-- Change school hours or the gap between visits (times are local to school_timezone)
update toilet_settings set value = '08:30' where key = 'school_start';
update toilet_settings set value = '15:30' where key = 'school_end';
update toilet_settings set value = '180' where key = 'visit_gap_minutes';

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
