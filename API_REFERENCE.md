# Frontend → Backend API reference

Every backend call this SPA makes, and **which endpoints the backend still has
to build**. The frontend was developed against an enhanced backend; this is the
contract a backend must satisfy for the app to work end‑to‑end.

- **Base URL**: `VITE_API_URL` (production build → `https://api.digital-academy.live`;
  unset → `http://localhost:8000`). Defined in `src/app/services/api.ts`.
- **Auth**: JWT (SimpleJWT). `Authorization: Bearer <access>`; refresh via
  `POST /api/token/refresh/`.
- **Response envelope**: the backend wraps payloads as
  `{ "success", "status", "data", "extra"? }`. The client unwraps with
  `unwrapApiData()`, so list/detail handlers should put the body under `data`.

Legend: ✅ already exists · ⚠️ exists but **shape must be updated** · 🆕 **must be created**.

---

## 🆕 Must be created in the backend (highlight)

These routes do **not** exist in the older backend and must be added:

| Method | Path | Purpose |
|---|---|---|
| 🆕 PATCH | `/api/users/my-courses/<enrollment_id>/` | Persist `{progress, status, completed_lectures}` (the old my‑courses is read‑only) |
| 🆕 POST | `/api/users/assignment/<lesson_id>/submit/` | Student submits an assignment (multipart: `files` ×N + `note`) |
| 🆕 GET | `/api/users/assignment/<lesson_id>/submission/` | The student's own submission history (newest first) |
| 🆕 POST | `/api/users/exercise/<lesson_id>/solution/` | Reveal an exercise's reference solution |
| 🆕 POST | `/api/users/exercise/<lesson_id>/submit/` | Submit exercise code (upsert) |
| 🆕 GET | `/api/users/exercise/<lesson_id>/submission/` | The student's submitted code |
| 🆕 GET | `/api/users/discussion/<lesson_id>/posts/` | List public discussion answers |
| 🆕 POST | `/api/users/discussion/<lesson_id>/posts/` | Post a public answer |
| 🆕 GET | `/api/users/notifications/` | Recent notifications + unread count (`extra.unread`) |
| 🆕 GET | `/api/users/notifications/unread-count/` | Unread count only |
| 🆕 POST | `/api/users/notifications/<id>/read/` | Mark one read |
| 🆕 POST | `/api/users/notifications/read-all/` | Mark all read |
| 🆕 POST | `/api/teachers/courses/<id>/units/` | Add a unit to an existing course |
| 🆕 PATCH | `/api/teachers/courses/<id>/units/<unit_id>/` | Edit a unit's title/desc |
| 🆕 POST | `/api/teachers/courses/<id>/reorder/` | Persist drag‑and‑drop reorder of units/lessons |
| 🆕 GET | `/api/teachers/assignment/<lesson_id>/submissions/` | Submissions for one lesson (tutor) |
| 🆕 GET | `/api/teachers/assignment/submissions/` | All submissions across the tutor's courses (inbox) |
| 🆕 PATCH | `/api/teachers/assignment/submission/<id>/grade/` | Grade + feedback (notifies the student) |

### Request / response shapes for the new endpoints

**`PATCH /api/users/my-courses/<enrollment_id>/`**
`{ "progress": 0-100, "status": "IN_PROGRESS"|"COMPLETED", "completed_lectures": string[] }`

**`POST /api/users/assignment/<lesson_id>/submit/`** (multipart) — fields: `files` (repeatable; capped to 1 unless the lesson has `allow_multiple_files`), `note`.
Returns the submission: `{ id, lesson, student, file, files:[{id,url,name}], note, grade, feedback, status:"SUBMITTED"|"GRADED", created_at, updated_at }`.

**`GET /api/users/assignment/<lesson_id>/submission/`** → array of the above (the student's attempts, newest first).

**`POST /api/users/exercise/<lesson_id>/solution/`** → `{ "solution": "..." }` (kept out of the lesson payload so it can't be read from DevTools).
**`POST /api/users/exercise/<lesson_id>/submit/`** `{ "code": "..." }` → `{ id, code, created_at, updated_at }` (upsert).
**`GET /api/users/exercise/<lesson_id>/submission/`** → same object or 204.

**`GET/POST /api/users/discussion/<lesson_id>/posts/`** — POST `{ "text": "..." }`. Item: `{ id, author, author_name, text, created_at }`. Public to everyone enrolled (+ the tutor).

**Notifications** — list returns `{ data:[{ id, type, title, message, link, meta, is_read, read_at, actor, actor_name, created_at }], extra:{ unread } }`. Created server‑side when a student submits (→ notify tutor) and when a tutor grades (→ notify student).

**`POST /api/teachers/courses/<id>/reorder/`** `{ "units": [{ "id": unitId, "lessons": [lessonId, ...] }, ...] }` — renumbers units + lessons and re‑parents moved lessons.

**`GET /api/teachers/assignment/submissions/`** → array of submissions with `lesson_title`, `course_id`, `course_title`, `student_full_name`/`student_email`, `files[]`, `status`. Optional `?status=SUBMITTED|GRADED`.
**`PATCH /api/teachers/assignment/submission/<id>/grade/`** `{ "grade": "...", "feedback": "..." }`.

---

## ⚠️ Exists, but the shape must be updated (lesson‑taxonomy v2)

| Method | Path | What changed |
|---|---|---|
| ⚠️ POST | `/api/teachers/courses/` | Nested create now sends `units[*].lessons[*]` with `kind`, `content_md`, `duration_min`, `external_url`, `assignment_instructions`, `assignment_due_at`, `allow_multiple_files`, `exercise`, `attached_quiz`, and multipart file keys `video_<u>_<l>` / `captions_<u>_<l>` / `presentation_<u>_<l>`. |
| ⚠️ POST·PATCH | `/api/teachers/lesson/` · `/api/teachers/lesson/<id>/` | Lessons gained: `kind` (VIDEO/ARTICLE/CHEATSHEET/EXERCISE/QUIZ/ASSIGNMENT/RESOURCE/DISCUSSION), `content_md`, `duration_min`, `captions`, `external_url`, `assignment_instructions`, `assignment_due_at`, `allow_multiple_files`, `exercise` JSON, `order`. |
| ⚠️ POST·PATCH | `/api/teachers/quiz/` · `/api/teachers/quiz/<id>/` | Quiz gained `time_limit_min`, `show_timer`. |
| ⚠️ GET | `/api/teachers/courses/<id>/` | Must include each lesson's `quizzes` (so the editor can pre‑fill an attached quiz) + unit/lesson `order`. |
| ⚠️ GET | `/api/users/my-courses/<id>/` | Must return `completed_lectures`, `progress`, and units→lessons with the v2 fields above + `quizzes`. |
| ⚠️ POST | `/api/users/quiz/<id>/submit/` | Response drives stars/coins: `{ correct_answers, total_questions, status, stars, attempt, coin_earned, total }`. |
| ⚠️ GET | `/api/users/my-courses/<id>/certificate/` | Frontend downloads via **GET** (blob). Ensure the certificate action accepts GET. |

---

## ✅ Already exists (no change)

| Method | Path | Purpose |
|---|---|---|
| ✅ POST | `/api/users/auth/login/` | email + password → `{access, refresh, user}` |
| ✅ POST | `/api/token/refresh/` | refresh access token |
| ✅ GET | `/api/users/auth/google/login/` | Google OAuth redirect |
| ✅ GET·PATCH | `/api/users/auth/profile/` | read / update profile |
| ✅ PATCH | `/api/users/auth/set-password/<user_id>/` | set password after Google signup |
| ✅ GET | `/api/users/courses/` · `/<slug or id>/` | catalog list / detail |
| ✅ GET | `/api/users/category/` | categories |
| ✅ GET·POST | `/api/users/comments/` (`?course=<id>`) | course comments |
| ✅ GET | `/api/users/leaderboard/` · `/<id>/` | leaderboard |
| ✅ GET | `/api/users/quiz-result/` · `/<id>/` | quiz result history |
| ✅ GET·POST | `/api/users/enrolment/` | enroll / list orders |
| ✅ GET | `/api/users/my-courses/` · `/<id>/` | enrolled list / detail |
| ✅ GET | `/api/users/quiz/<id>/` | quiz detail |
| ✅ GET·POST·PATCH·DELETE | `/api/teachers/courses/` · `/<id>/` | course CRUD |

> A reference implementation of every 🆕/⚠️ item already exists in the team's
> `back/` backend folder (kept out of this repo). Use it as the source of truth.
