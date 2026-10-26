# CodeMove Kenya – upgraded project (all changes in one place)

This folder is your original project plus every change made so far. Secrets are NOT included:
create `server/.env` and `client/.env` from the `.env.example` files.

## 1. Database – run in the Supabase SQL Editor
New project: run `schema.sql`, `teacher_admin.sql`, `migration-authoring.sql`, `migration-grading.sql`, then the course seed
(`seed_all_courses.sql` OR the four numbered seeds, never both), THEN the three new files, in this order:
1. `supabase/migration-hide-lessons.sql`      – hide / release lessons
2. `supabase/migration-schedule-lessons.sql`  – scheduled release
3. `supabase/migration-lesson-codes.sql`      – class codes (also removes a security hole: learners could read the lessons table directly)

Existing project: run only the three new files, in that order.
Make yourself admin (after signing up): `update users set role = 'admin' where email = 'you@example.com';`

## 2. What changed
| Feature | Where |
|---|---|
| Plain-text lesson notes (no HTML); old lessons convert automatically | server/lib/lessonText.js, routes/content.js, routes/staff.js, Teacher.jsx, Authoring.jsx |
| Picture / video / web links in lessons (`[image: url | caption]`, bare links, `[text](url)`) | server/lib/lessonText.js, Lesson.jsx |
| Full-width layout, wrapping text, phone menu fix | client/src/styles.css, components/Editor.css |
| Hide / release lessons (one, or a whole module) | routes/staff.js, content.js, learning.js, Teacher.jsx |
| Scheduled release + "drip" a module | server/lib/visibility.js, routes/staff.js, Teacher.jsx, Course.jsx |
| Class access codes (issue, time window, lock again, bulk) | routes/staff.js, routes/learning.js (/lessons/unlock), Course.jsx, Lesson.jsx |
| Google sign-in button | client/src/pages/Login.jsx (+ Google & Supabase setup below) |
| Several allowed site addresses; `/health/db`; listens on 0.0.0.0 | server/index.js |
| Cloudflare deploy config | client/wrangler.jsonc |
| Landing page | client/public/welcome.html (served at /welcome.html) |
| Free hosting manual | docs/CodeMove-Free-Hosting-Manual.md |

## 3. Settings you still do by hand
- **Server `.env`:** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CLIENT_ORIGIN` (your site address; several allowed, comma-separated), `PORT`.
- **Client `.env` / Cloudflare build variables:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_URL` (must end in `/api`).
- **Google sign-in:** Google Cloud -> OAuth client (JavaScript origin = your site; redirect URI = the Callback URL shown in
  Supabase -> Authentication -> Providers -> Google). Paste Client ID + secret into Supabase, publish the Google app, and set
  Supabase -> Authentication -> URL Configuration (Site URL + Redirect URLs) to your site address.
- **Landing page:** change the contact email at the bottom of `client/public/welcome.html` (currently info@codemove.co.ke).
- Keep Supabase awake: point a free uptime monitor at `https://YOUR-API/health/db`.

## 4. Merging with your own edits
This project was rebuilt from the ORIGINAL upload plus my changes, so it does not contain edits you made yourself since
(for example the "dimensions" commit, or a changed `.env.production.local`). Do not overwrite your folder blindly:
1. In your repo: `git checkout -b upgrade`
2. Copy these files over it (leave out node_modules and any .env files).
3. In VS Code's Source Control panel, open each changed file and keep your own edits where they differ.
4. Run `npm install` in `client` and `server`, test locally, then merge and push.

## 5. Run locally
- Server: `cd server && npm install && npm start`   (needs server/.env)
- Client: `cd client && npm install && npm run dev`  (needs client/.env)
