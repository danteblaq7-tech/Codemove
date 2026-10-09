# CodeMove update – what to copy where

| File | Action |
|---|---|
| supabase/migration_authoring.sql | NEW – run once in the Supabase SQL editor |
| server/routes/authoring.js | NEW |
| server/index.js | REPLACE |
| server/routes/content.js | REPLACE |
| server/routes/learning.js | REPLACE |
| client/src/components/Authoring.jsx + Authoring.css | NEW |
| client/src/components/Editor.jsx | REPLACE |
| client/src/components/Editor.css | NEW |
| client/src/pages/Lesson.jsx | REPLACE |
| client/src/pages/staff/Admin.jsx | REPLACE |
| client/src/pages/staff/Teacher.jsx | REPLACE |

Optional in server/.env:  TEACHERS_CAN_CREATE_LEARNERS=false   (teachers can then only enrol existing learners)

No new npm packages. Restart the API after copying. Every changed spot is marked NEW / CHANGED in a comment.
