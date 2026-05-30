# Gamification — implementation plan (frontend-only, backend frozen)

## Goal

Surface the existing backend gamification system in the Digital Academy frontend so students see coins, stars, tiers (Bronze/Silver/Gold/Platinum), weekly leaderboard position, and quiz history. The system already runs on the backend — frontend currently shows none of it.

## Backend reality check

Confirmed via `https://api.digital-academy.live/swagger/users/` and `github.com/digital-academy-team/back/apps/`.

### Endpoints that exist (use as-is)

| Method | Path | Returns | Notes |
|--------|------|---------|-------|
| GET    | `/api/users/auth/profile/`     | `Profile` | includes `coin`, `username`, `avatar`, `first_name`, `last_name`, `email`, `phone_number` |
| PATCH  | `/api/users/auth/profile/`     | `Profile` | accepts `ProfileUpdate` — username, first/last name, avatar, email, phone editable |
| GET    | `/api/users/leaderboard/`      | `Leaderboard[]` | weekly window, sorted by `position` |
| GET    | `/api/users/leaderboard/{id}/` | `Leaderboard`   | single row |
| GET    | `/api/users/quiz-result/`      | `QuizResult[]`  | full quiz history per user |
| GET    | `/api/users/quiz-result/{id}/` | `QuizResult`    | single result |
| POST   | `/api/users/quiz/{id}/submit/` | `QuizResult` (verify at runtime — swagger says QuizSubmit but service code returns full result with `stars`, `attempt`, `course_progress`) |

### Backend behavior (frozen — must mirror exactly in UI copy)

From `apps/quiz/services/quiz_result.py`:

- **Star table** (per quiz attempt):
  - `percent >= 90` → 3 stars
  - `80 <= percent < 90` → 2 stars
  - `70 <= percent < 80` → 1 star
  - `percent < 70` → 0 stars
- **Pass threshold**: `percent >= 60` → status `PASSED`, else `FAILED`.
- **Coin reward**: only when `attempt == 1` AND `percent >= 70`. Amount based on user's **last week's tier**:
  - Bronze → 4, Silver → 6, Gold → 8, Platinum → 10.
  - First-ever quiz = no last-week tier → coin = 0 (backend behavior). UI must communicate this.
- **Tier thresholds** (`apps/quiz/services/quiz_result.py::_resolve_tier`):
  - `total_stars >= 50` → Platinum
  - `>= 40` → Gold
  - `>= 30` → Silver
  - `< 30` → Bronze (no minimum — every active user starts here)
  - **NB**: user-supplied spec said Bronze = 20 stars. Backend uses 30. Backend wins (frozen).
- **Leaderboard window**: rolling 7 days from "today". Position = rank by `total_stars` desc.
- **`total_stars` formula**: sum of `MAX(stars)` per `quiz_id` within the week. Retakes don't double-count; only the best attempt counts toward leaderboard.

### Endpoints MISSING (out of scope for v1)

- Stickers — no model, no endpoint.
- Digital goods / shop — no `Order` of cosmetic goods, no inventory.
- Achievement/badge system beyond tier — none.
- Sticker awarding rules — none.

**Decision**: defer stickers + digital goods to v2. Document as "coming soon" in UI if surfaced at all. Do NOT fake them via localStorage — would mislead students about coin balance utility.

### Frontend gaps today

- `Profile` page does not render `coin` or `username`.
- No leaderboard page or route.
- No quiz-result history view.
- `courseApi.submitQuiz` discards `stars`, `attempt`, `course_progress` from response — only reads `correct_answers`, `total_questions`, `status`.
- `Learn.tsx` quiz result toast does not show stars/coin earned.
- Tier badge not shown anywhere.
- Username field not editable in profile UI.

## Data model (frontend)

Add to `src/app/services/api.ts`:

```ts
export type Tier = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';

export interface ProfileResponse {
  id: string;
  avatar: string | null;
  email: string | null;
  first_name: string;
  last_name: string;
  username: string | null;
  coin: number;
  phone_number: string | null;
}

export interface ProfileUpdatePayload {
  avatar?: string | null;
  email?: string | null;
  first_name?: string;
  last_name?: string;
  username?: string | null;
  phone_number?: string | null;
}

export interface LeaderboardEntry {
  username: string;
  tier: Tier;
  total_stars: number;
  position: number | null;
  reward_coin: number;
}

export interface QuizResultEntry {
  id: string;
  quiz_title: string;
  correct_answers: number;
  wrong_answers: number;
  total_questions: number;
  status: 'PASSED' | 'FAILED';
  stars: number;
  total: string;
  attempt: number;
}

// Response from POST /quiz/{id}/submit/ — includes gamification fields
export interface QuizSubmitResultResponse {
  id?: string;
  quiz?: string;
  correct_answers: number;
  wrong_answers: number;
  total_questions: number;
  status: 'PASSED' | 'FAILED';
  stars: number;
  attempt: number;
  total?: string;
  course_progress?: number;
  coin_earned?: number; // verify presence at runtime; if absent, derive client-side from attempt+percent+last-tier
}
```

## State / persistence

- **No new context.** Augment `AuthContext`:
  - Add `coin: number` and `tier: Tier | null` to user state.
  - Refresh on login, after quiz submit, when user opens Profile/Leaderboard.
- **Cache**: leaderboard list cached in component state for the open page only — no localStorage (weekly data, freshness matters).
- **localStorage**: do NOT cache coin/stars/tier — always source of truth is backend `/auth/profile/` and `/leaderboard/`.
- Existing `digital_academy_auth` payload extends to carry coin/tier; reset on logout.

## UI surface

### New page: Leaderboard

- Route: `/leaderboard` (gated via `ProtectedRoute`; redirect to `/login` otherwise).
- Layout: header with current user's tier badge + position + total_stars + coin balance, then ranked table.
- Tier badge: colored chip with WCAG-AA contrast in both themes — Bronze=#CD7F32 (white text), Silver=#9CA3AF (white text — pure #C0C0C0 fails contrast), Gold=#D4A017 (white), Platinum=#94A3B8 with subtle gradient. Reuse shadcn `Badge` with `tier-*` variants in `class-variance-authority`.
- Tier badges have `role="img"` + `aria-label="<Tier> tier"`.
- Mobile (`< sm`): card list layout (one card per entry: rank #N, username, tier chip, stars). Drop the table.
- Tablet/desktop (`>= sm`): ranked table with sticky header.
- Refetch on `document.visibilitychange` → visible (weekly window can shift mid-session).
- Empty state: "Complete a quiz this week to enter the leaderboard."
- Loading: skeleton rows (5 placeholders).

### New page: Quiz history

- Route: `/profile/quiz-history` (sub-route under Profile).
- Table: quiz title, date, stars (★ × n), score, attempt #, status.
- Sort: most recent first.

### Edited page: Profile (`src/app/pages/Profile.tsx`)

- Add coin balance card (with coin icon + integer).
- Add tier badge with current week's `tier` and `position`.
- Make `username` editable inline (PATCH `/auth/profile/`).
- Link to `/leaderboard` and `/profile/quiz-history`.

### Edited page: Learn (`src/app/pages/Learn.tsx`)

- Quiz result modal: render stars earned (0–3), attempt number, coin earned (if any).
- Copy matrix:
  - `attempt === 1 && percent >= 70 && hasLastWeekTier` → "You earned **N coins** + **N stars**!"
  - `attempt === 1 && percent >= 70 && !hasLastWeekTier` → "Great score! Coins unlock once you have a weekly tier — finish more quizzes to climb to Bronze."
  - `attempt === 1 && percent < 70` → "No stars this attempt. Pass mark is 70% for stars, 60% for course progress. Try again."
  - `attempt > 1` → "Practice mode — coins are first-attempt only, but stars on the leaderboard track your best score per quiz."
- Star animation: 0.4s reveal per star (motion).
- Result panel must be `role="status"` + `aria-live="polite"` so screen readers announce score.

### Edited component: Header (`src/app/components/Header.tsx`)

- For authenticated student: small coin pill + tier dot in the top-right cluster.
- ≥ 360px: both coin pill and tier dot visible.
- < 360px: tier dot only (coin still reachable via Profile).
- Tier dot has `title` and `aria-label` describing tier name + position.
- **Source-of-truth**: `coin` comes from `Profile` endpoint, `tier` + `position` from `Leaderboard` endpoint (filter rows by current username). AuthContext stores both, derived from two separate calls fired on auth bootstrap + after quiz submit. If user not yet on leaderboard (no stars this week), tier dot shows neutral "—" placeholder with aria-label "Unranked".

### Tier-up celebration

- After every successful quiz submit AND after `/auth/profile` refresh, compare new tier vs cached previous tier in `AuthContext`.
- On promotion (Bronze→Silver→Gold→Platinum), fire `toast.success` with "You reached <Tier>!" + brief copy.
- Cache previous tier in `localStorage` under `da_last_tier` so promotion is detected once even across sessions.
- Demotion (e.g., Silver→Bronze when week resets): silent. No negative toast.

### Out of v1: stickers, digital goods shop

- Add a single placeholder card on Profile: "Sticker shop coming soon." Do not link, do not fake balance.

## Task list

Each task assigned to one agent. Format: `[agent] description — files — acceptance.`

- [ ] **[types-syncer]** Add `ProfileResponse`, `ProfileUpdatePayload`, `LeaderboardEntry`, `QuizResultEntry`, `QuizSubmitResultResponse`, `Tier` to `src/app/services/api.ts`. Place near related types. — `src/app/services/api.ts` — typecheck passes; no logic changes.
- [ ] **[api-integrator]** Add `authApi.getProfile()` (real impl, replace placeholder), `authApi.updateProfile(payload)` (PATCH), `leaderboardApi.list()`, `leaderboardApi.detail(id)`, `quizResultApi.list()`, `quizResultApi.detail(id)`. Update `courseApi.submitUserQuiz` to return `QuizSubmitResultResponse` shape verbatim (no field stripping). — `src/app/services/api.ts` — each method typed, uses `apiRequest`, hits correct path, errors propagate.
- [ ] **[api-integrator]** Verify POST /quiz/{id}/submit/ actual response at runtime via Chrome MCP (swagger may be wrong). Update `QuizSubmitResultResponse` if shape differs. — runtime check, doc result in PR description.
- [ ] **[react-builder]** Build `src/app/pages/Leaderboard.tsx`: fetch `leaderboardApi.list()`, render tier badges + table, current-user row pinned at top. Register route `/leaderboard` in `src/app/routes.tsx` behind `ProtectedRoute`. — page renders at three breakpoints (mobile/tablet/desktop), error toast on fetch fail.
- [ ] **[react-builder]** Build quiz history sub-route `/profile/quiz-history` using `quizResultApi.list()`. — sortable, paginated client-side if >20 rows, dark/light theme works.
- [ ] **[react-builder]** Update `src/app/pages/Profile.tsx`: coin card, tier badge, editable username (PATCH onBlur with validation: 3–50 chars, `^[a-zA-Z0-9_]+$`). Add nav links to `/leaderboard` and `/profile/quiz-history`. — username save shows toast, error message rendered inline.
- [ ] **[react-builder]** Update `src/app/pages/Learn.tsx` quiz result UI: render stars, attempt, coin earned, helpful copy when `attempt > 1` or `percent < 70`. — uses real response fields, no mocked numbers.
- [ ] **[react-builder]** Update `src/app/components/Header.tsx`: coin pill + tier dot for authenticated students; coin pill hidden < 360px, tier dot always shown. `aria-label` on tier dot. — does not break existing dropdown.
- [ ] **[react-builder]** Add tier-up celebration in `AuthContext`: cache `da_last_tier` in localStorage, compare on every profile refresh, fire `toast.success` on promotion. Silent on demotion. — manual test: bump test user past 30/40/50 stars threshold.
- [ ] **[bug-hunter]** After login + after quiz submit + after username PATCH, verify `AuthContext` user state updates to fresh `coin`/`tier`. Fix any stale-state bugs. — manual flow: login → submit quiz → reload Profile, all values fresh.
- [ ] **[i18n-fixer]** Translate all new strings (Leaderboard, Quiz history, tier names, coin tooltips, retry copy) to whatever languages the project currently supports inline. — match existing repo style.
- [ ] **[perf-auditor]** Lazy-load `/leaderboard` and `/profile/quiz-history` routes via `React.lazy` + `Suspense`. — bundle for non-logged-in landing route does not grow.

## Risks / open questions

1. **Swagger may misreport submit response.** Service code returns full `QuizResult` object; swagger says `QuizSubmit`. Confirm before frontend wires field reads. (api-integrator task #2 above.)
2. **Tier mismatch with user-supplied spec** (Bronze 20 vs backend ≥0). Confirm with stakeholder whether backend will adjust or UI must show backend numbers.
3. **`coin_earned` field**: not visible in swagger but logical for UX. If missing, derive client-side: `attempt === 1 && stars >= 1 ? coinFromTier(lastWeekTier) : 0`.
4. **First-quiz-ever no coin** (because no last-week tier). UX should NOT promise coins on first quiz; copy must clarify.
5. **Leaderboard week boundary**: backend uses rolling 7-day window from "today", not Mon–Sun. UI copy: "Last 7 days" not "This week."
6. **Username uniqueness**: backend max 50 chars, nullable. Uniqueness enforcement unknown — handle 400/409 from PATCH gracefully. Allowed character set is also unknown — frontend regex `^[a-zA-Z0-9_]+$` is provisional; widen if backend accepts `.` / `-`.
7. **Stickers / digital goods**: out of scope. Profile card placeholder only. Do not introduce client-side fake state.

## Order of execution

1. types-syncer (types in place — unblocks everything else).
2. api-integrator (methods + runtime swagger check).
3. react-builder × 5 (pages and components — can run in parallel after #2).
4. bug-hunter (validate end-to-end after UI lands).
5. i18n-fixer (last pass for strings).
6. perf-auditor (lazy routes — final, with bundle measurement).

Hand off to: types-syncer → api-integrator → react-builder → bug-hunter → i18n-fixer → perf-auditor.
