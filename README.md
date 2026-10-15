# CodeMove Kenya

React (Vite) client · Node/Express API (vanilla JS, ESM) · Supabase (Postgres + Auth).

**Split of duties:** Supabase handles sign-up/login (Auth) and the database. The Node API verifies the Supabase JWT, then reads/writes with the service-role key. Quiz answers are graded on the server, so `is_correct` never reaches the browser.

## Setup
1. Create a Supabase project. In the SQL editor run `supabase/schema.sql` (tables, RLS, seed course).
2. `cd server && cp .env.example .env` (fill keys) `&& npm i && npm run dev` (needs Node 22+).
3. `cd client && cp .env.example .env` (fill keys) `&& npm i && npm run dev` → http://localhost:5173
4. Sign up in the app, then open the seeded "HTML Fundamentals" course.

## Deploying the API server
Configure the Enhance **Deploy Node.js** fields as follows when deploying from the repository root:

| Enhance field | Value |
| --- | --- |
| Node version | 22 or later |
| Startup command | `npm start` |
| Working directory | `server` |
| Path | Leave blank to proxy the entire website (or `/` if the panel requires a value) |
| Port | The port selected in Enhance; set `PORT` to the same value if Enhance does not inject it automatically |

The server already listens on `0.0.0.0` and uses `process.env.PORT`, as required by Enhance. Make sure dependencies are installed from the `server` working directory (`npm ci`) during deployment if Enhance does not install them automatically.

Configure these server environment variables in the hosting panel:
   - `SUPABASE_URL`: your Supabase project URL.
   - `SUPABASE_SERVICE_ROLE_KEY`: the Supabase service-role key. Keep this server-side; never add it to the client app.
   - `CLIENT_ORIGIN`: the deployed client’s origin, for example `https://codemove.kirigimary2.workers.dev` (no trailing slash).
   - `PORT`: the same port selected in Enhance, unless the platform injects it automatically.
After deploying, verify `https://<your-api-domain>/health` returns `{"ok":true}`. Set the client build-time variable `VITE_API_URL` to `https://<your-api-domain>/api`, then rebuild and deploy the client.

For local development, copy `server/.env.example` to `server/.env`; `npm run dev` loads it automatically. Production uses environment variables configured by the host and does not require a `.env` file.

## Notes
- `users` is a profile table keyed to `auth.users.id`; passwords live in Supabase Auth, so `password_hash` is not stored here.
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to the client.
- Design tokens from the design doc are in `client/src/styles.css` (light + dark).

## Teacher & admin portal
1. Run `supabase/teacher_admin.sql` (roles, `is_active`, `classes`, `class_members`).
2. Make yourself the first admin: `update users set role='admin' where email='you@school.ke';`
3. Restart the API. Teachers/admins now see **Teacher** / **Admin** links in the sidebar.
- Sign-ups are always `learner`; only admins can create teachers or change roles (`/api/admin/*`, checked server-side from the DB role).
- Disabling a user also bans them in Supabase Auth. Password resets are set by an admin as a temporary password.
- Teachers only see classes assigned to them; admins create classes and assign teachers.
