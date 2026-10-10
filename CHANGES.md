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

AFTER ADDING QUIZZES AND LEADERBOARD
# CodeMove update 2 – grading, leaderboard & quizzes

Apply AFTER update 1 (it builds on content.js / learning.js / index.js / Admin.jsx / Teacher.jsx from update 1).

| File | Action |
|---|---|
| supabase/migration_grading.sql | NEW – run once in the Supabase SQL editor |
| server/lib/scores.js | NEW – the grading policy (weights + grade bands) lives here |
| server/routes/rankings.js | NEW – staff rankings + student leaderboard |
| server/routes/quizzes.js | NEW – quiz authoring |
| server/index.js | REPLACE |
| server/routes/content.js | REPLACE |
| server/routes/learning.js | REPLACE |
| client/src/lib/csv.js | NEW |
| client/src/components/Assessment.css | NEW |
| client/src/components/Rankings.jsx | NEW |
| client/src/components/QuizBuilder.jsx | NEW |
| client/src/pages/Leaderboard.jsx | NEW |
| client/src/components/Layout.jsx | REPLACE (adds the Leaderboard link) |
| client/src/App.jsx | REPLACE (adds the /leaderboard route) |
| client/src/pages/Quiz.jsx | REPLACE |
| client/src/pages/Course.jsx | REPLACE |
| client/src/pages/staff/Admin.jsx | REPLACE |
| client/src/pages/staff/Teacher.jsx | REPLACE |

No new npm packages. Restart the API after copying. Changed spots are marked NEW / CHANGED in comments.

# Update 3 – plain-text notes, picture/video links, wider layout
Copy these over your project (same paths). No SQL, no new npm packages. Restart the API.

| File | Action |
|---|---|
| server/lib/lessonText.js | NEW – turns typed notes into HTML (the "backend presentation") |
| server/routes/content.js | REPLACE – learners get the rendered notes |
| server/routes/staff.js | REPLACE – editor gets plain text (old HTML lessons convert automatically) |
| client/src/components/Authoring.jsx + Authoring.css | REPLACE – plain-text box + format help |
| client/src/pages/staff/Teacher.jsx | REPLACE – "Edit lessons" uses plain text |
| client/src/pages/Lesson.jsx | REPLACE – links open in a new tab |
| client/src/styles.css, client/src/components/Editor.css | REPLACE – full-width layout, wrappin