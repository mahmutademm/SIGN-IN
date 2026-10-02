# Restroom Sign-In

Static site backed by Supabase (project `fomzenfbdtoqwknqtkzi`, free tier).

- `index.html`: student kiosk. Shows a class picker; `index.html?class=8A` opens that class's own sign-in page.
- `teacher.html`: teacher log, unlocked with the shared teacher code. Filter by date range, class, or student; download CSV.
- `config.js`: Supabase URL and publishable key (safe to be public).

## Database (all prefixed `toilet_`)

| Table | Contents |
|---|---|
| `toilet_students` | email, name, class_name. The roster, readable by the kiosk |
| `toilet_signins` | student_email, class_name, signed_at. Not directly readable or writable by the public key |
| `toilet_settings` | bcrypt hash of the teacher code |

Functions: `toilet_sign_in(email)`, `toilet_check_code(code)`, `toilet_teacher_signins(code, from, to, class)`.

## Common tasks (Supabase → SQL Editor)

```sql
-- Change the teacher code
update toilet_settings set value = extensions.crypt('NEW-CODE', extensions.gen_salt('bf')) where key = 'teacher_code_hash';

-- Add a student / move a student to another class
insert into toilet_students values ('name@edepacademy.org', 'First Last', '8A');
update toilet_students set class_name = '8B' where email = 'name@edepacademy.org';
```

## Hosting

Any static host works (GitHub Pages, Netlify, Cloudflare Pages). No build step is needed.
For a local test, run `python -m http.server` in this folder and open http://localhost:8000.

Note: free Supabase projects pause after 7 days with no activity. Daily school use keeps the project active.
