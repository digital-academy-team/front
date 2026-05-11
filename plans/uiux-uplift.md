# UI/UX Uplift — implementation plan

## Overview

Broad polish pass across the Digital Academy frontend: fix blocking TypeScript errors, give the app a working dark mode, replace blank-during-fetch screens with skeleton/empty/error states, split the largest page, tighten form a11y, dedupe the bundle, lazy-load routes, and clean up minor polish items (search debounce, image lazy attrs, toaster behavior). Scoped for one milestone — no new product features.

## Scope

Frontend only. Backend is frozen. No new endpoints, no schema changes, no gamification (covered in `plans/gamification.md`).

## Out of scope

- Gamification (coins, stars, tiers, leaderboard, quiz history) — see `plans/gamification.md`.
- Backend changes of any kind.
- New product features beyond polish (no new pages, no new flows).
- Replacing react-router 7 / Tailwind v4 / shadcn — stack is fixed.
- Adding tests / ESLint / react-query — separate initiative.

## Pre-flight facts already verified

- `src/main.tsx` actively strips `dark` class and clears `da_theme` on every load — `ThemeContext.tsx` is orphaned by design.
- `package.json` declares MUI (`@mui/material`, `@mui/icons-material`, `@emotion/react`, `@emotion/styled`), `react-slick`, `react-popper`, `react-responsive-masonry`, but **`grep "from '@mui'"` and friends across `src/` returns zero matches**. These are pure dead deps — removal is risk-free for runtime, only cleans `node_modules` / lockfile.
- `src/app/routes.tsx` imports all 19 page modules eagerly.
- 8 `.tsx` files still contain raw `<img>` tags (Header search and CourseCard already fixed).
- `ThemeContext` and `useTheme` are not imported anywhere in `src/` (the lone `useTheme` hit in `components/ui/sonner.tsx` is the `next-themes` import — unrelated).

## Task list

Owner agents in `[brackets]`. Effort: **S** ≤ 1h, **M** 1–3h, **L** 3h+.

---

### 1. Fix pre-existing TypeScript errors `[bug-hunter]` — **S**

Blocking — the strict TS build currently fails. Until this passes, downstream agents cannot rely on `tsc --noEmit` as a verification step.

**Files**:
- `src/app/pages/Learn.tsx` — ~13 implicit-any errors in `mapApiQuizToUi`, the `section`/`sIdx` map callbacks, the `reduce` accumulators (`sum`, `s`), and an index-signature error on line ~31.
- `src/app/store/AuthContext.tsx:314` — `register` typed `Promise<'verification_sent'>` but returns a widened `Promise<string>`; same for `verifyRegistration` returning `Promise<'student' | 'instructor'>`.

**Approach**:
- Annotate map / reduce callbacks with explicit types from the imported `MyCourseDetailResponse` shape; don't introduce new aliases unless the inline type repeats >3 times.
- In `AuthContext.tsx`, narrow returns with `as const` on the literal returns, or change the function bodies to return the literal string typed at source. Do **not** widen the public interface.
- Re-run `npx tsc --noEmit` and confirm zero errors.

**Acceptance**:
- `npx tsc --noEmit` exits 0.
- No `any` introduced; no behavior change at runtime.
- Auth flow still works (login → profile, register → verify → role assignment).

---

### 2. Revive `ThemeContext` and ship dark mode `[react-builder]` — **M**

Currently `ThemeContext.tsx` exists but is dead code; `main.tsx` strips the `dark` class on every load. Reviving costs little and is high-impact for students working late.

**Files to touch**:
- `src/main.tsx` — remove the two scrub lines (`classList.remove('dark')`, `removeItem('da_theme')`); wrap `<App />` in `<ThemeProvider>`.
- `src/app/store/ThemeContext.tsx` — extend default-state logic: read `localStorage.da_theme` → fall back to `window.matchMedia('(prefers-color-scheme: dark)').matches` → fall back to `'light'`. Guard for SSR / no-`matchMedia` envs even though this is CSR-only.
- `src/app/components/Header.tsx` — add a `<button>` next to the user avatar (desktop) and inside the mobile menu drawer that calls `toggleTheme()`. Use lucide `Sun` / `Moon` icons. `aria-label="Toggle theme"`, `aria-pressed={theme === 'dark'}`.
- Audit pages for missing `dark:` Tailwind classes. Most pages are light-only today; **don't** try to convert them all in this task. Cover only the chrome (`Header`, `Layout`, top-level page backgrounds, `NotFound`, auth pages already use a gradient that survives both modes). Park the rest as task 2b.

**Acceptance**:
- Toggle persists across reload via `localStorage.da_theme`.
- First-load respects `prefers-color-scheme`.
- No FOUC (set the class on `document.documentElement` synchronously inside `ThemeProvider`'s initial `useState`, not just inside `useEffect` — alternatively keep a tiny inline script in `index.html` that reads `da_theme` before React mounts; prefer the inline-script route for zero-flicker).
- `dark:` classes look correct on: Header (sticky bar, dropdown), Layout (page background), NotFound, Login, Signup.

---

### 2b. Dark-mode class sweep for remaining pages `[react-builder]` — **M**

Follow-up to task 2, kept separate so the toggle ships fast.

**Files**:
- `src/app/pages/Home.tsx`
- `src/app/pages/CourseListing.tsx`
- `src/app/pages/CourseDetail.tsx`
- `src/app/pages/Profile.tsx`
- `src/app/pages/Cart.tsx`
- `src/app/pages/Checkout.tsx`
- `src/app/pages/dashboard/StudentDashboard.tsx`
- `src/app/pages/instructor/InstructorDashboard.tsx`
- `src/app/pages/Learn.tsx`
- `src/app/pages/Search.tsx`
- `src/app/pages/Help.tsx`, `AboutUs.tsx`, `ContactUs.tsx`
- `src/app/pages/Certificate.tsx` (preview card; printed cert must stay light regardless of mode — guard with `print:bg-white` etc.).

**Approach**: For each, add `dark:bg-*`, `dark:text-*`, `dark:border-*`, `dark:hover:*` to cards, hero blocks, table rows, and input borders. Do not redesign — match the existing light palette inverted via `slate-900` / `slate-100` family. Audit shadcn primitives in `components/ui/` (most already ship `dark:` classes; flag any that don't).

**Acceptance**:
- Toggle to dark on every page in the route table — no white blocks bleeding through.
- Certificate print still renders as a light-themed PDF.

---

### 3. Skeleton, empty, and error states `[react-builder]` — **L**

Pages currently flash blank during fetch and show toast-only errors. Replace with inline states.

**New primitives** (create in `src/app/components/ui/`):
- `Skeleton.tsx` — wrapper around a div with `animate-pulse bg-muted rounded`. Accepts `className` for sizing. (shadcn ships this already in some setups — confirm whether `components/ui/skeleton.tsx` exists; if so, reuse.)
- `CourseCardSkeleton.tsx` — matches `CourseCard` layout (image 16:9, two text bars, footer row).
- `ListSkeleton.tsx` — accepts `rows: number` prop; renders that many stacked card / row skeletons.
- `EmptyState.tsx` — props: `icon?: ReactNode`, `title: string`, `description?: string`, `action?: { label: string; to?: string; onClick?: () => void }`.
- `ErrorState.tsx` — props: `title?: string` (default "Couldn't load this"), `description?: string`, `onRetry: () => void`.

**Pages to wire**:

| Page | Loading | Empty | Error |
|------|---------|-------|-------|
| `pages/CourseListing.tsx` | `ListSkeleton rows={9}` in a 3-col grid | "No courses match your filters" + reset CTA | `<ErrorState onRetry={refetch}>` |
| `pages/CourseDetail.tsx` | hero skeleton + curriculum skeleton | n/a (404 → NotFound page) | `<ErrorState>` full-page |
| `pages/Profile.tsx` | tab-area skeleton per tab | per-tab ("No enrolled courses yet", "No certificates yet", etc.) | inline per tab |
| `pages/Learn.tsx` | sidebar + player skeleton | n/a | `<ErrorState>` full-page |
| `pages/dashboard/StudentDashboard.tsx` | dashboard card skeletons | "Enroll in your first course" CTA → `/courses` | inline |
| `pages/instructor/InstructorDashboard.tsx` | course-row skeletons | "Create your first course" CTA → wizard | inline |
| `pages/Cart.tsx` | skeleton rows | "Your cart is empty" + browse CTA (may already exist — confirm) | inline |
| `pages/Search.tsx` | skeletons | "No results for `<query>`" | inline |

**Empty-state copy** (use verbatim, then revisit in i18n pass):
- CourseListing — "No courses match your filters." sub "Try clearing one or more filters."
- Profile › courses — "You haven't enrolled in anything yet."
- Profile › certificates — "Finish a course to earn your first certificate."
- Profile › orders — "No purchases yet."
- Profile › reviews — "You haven't reviewed any courses yet."
- Cart — "Your cart is empty." sub "Browse courses to get started."
- Search — "No results for `{query}`."

**Acceptance**:
- Every listed page shows a skeleton during initial fetch (never a blank page).
- Switching network throttling to "Slow 3G" in devtools always shows the skeleton, then content.
- Force-failing the fetch (block via devtools) shows `<ErrorState>` with a working retry button.
- All empty states have a CTA where one makes sense (Cart → browse; Profile → enroll; Search → clear).
- Skeleton primitives have no business logic and are reusable.

---

### 4. Split `InstructorDashboard.tsx` (1051 LOC) `[page-refactorer]` — **L**

Single file owns: instructor's course list, course-create wizard, lessons editor, quizzes editor, and shared state. Split along these natural seams.

**Extract to**:
- `src/app/hooks/useInstructorCourses.ts` — fetches `/api/instructor/courses/` (or whatever existing call lives in this page), exposes `{ courses, loading, error, refetch, createCourse, updateCourse, deleteCourse }`.
- `src/app/hooks/useInstructorCourseDetail.ts` — for the focused-course view (units / lessons / quizzes).
- `src/app/pages/instructor/components/InstructorCourseList.tsx` — list + search + filter UI.
- `src/app/pages/instructor/components/CourseCreateWizard.tsx` — multi-step form (title → description → category → cover image → confirm).
- `src/app/pages/instructor/components/LessonEditor.tsx` — adds/edits lessons inside a unit.
- `src/app/pages/instructor/components/QuizEditor.tsx` — adds/edits quiz + variants.
- Trimmed `src/app/pages/instructor/InstructorDashboard.tsx` becomes a router/shell that composes the above.

**Acceptance**:
- `InstructorDashboard.tsx` < 250 LOC after split.
- Each extracted file < 350 LOC.
- All existing behavior preserved — manually walk the flow: list → click course → edit lesson → save → add quiz → save → delete lesson → confirm.
- No new API calls introduced (frontend reorganization only).
- `npx tsc --noEmit` still passes.

---

### 5. Search UX uplift `[react-builder]` — **S**

`Header.tsx` already has ARIA roles and Escape-to-close (shipped). Remaining gaps: filter runs on every keystroke (no debounce), arrow-key navigation in the dropdown is missing.

**Files**:
- `src/app/components/Header.tsx`
- (optional) `src/app/hooks/useDebouncedValue.ts` — small generic hook.

**Changes**:
- Wrap the search filter in `useDeferredValue` *or* a 200ms `useDebouncedValue` hook. Prefer the hook — it's reusable elsewhere (Search page).
- Add `ArrowDown` / `ArrowUp` to move `activeIndex` through results. `Enter` navigates to the highlighted result. `Escape` already closes (verify).
- When `activeIndex` changes, scroll the highlighted row into view (`scrollIntoView({ block: 'nearest' })`).
- Update `aria-activedescendant` on the input to point at the highlighted row's id.

**Acceptance**:
- Typing `react` quickly does not re-render the dropdown >2× more than necessary (eyeball in React Profiler).
- Keyboard: Tab into input, type 2+ chars, ArrowDown highlights row 1, ArrowDown again row 2, Enter navigates, Escape closes.
- Screen-reader announces the active row via `aria-activedescendant`.

---

### 6. Image `<img>` sweep `[react-builder]` — **S**

8 files still contain raw `<img>` tags. Add `loading="lazy"` and `decoding="async"` everywhere, plus `width` / `height` attrs where the rendered size is known to prevent CLS.

**Files**:
- `src/app/components/figma/ImageWithFallback.tsx` (central wrapper — add the attrs here as defaults, then most other usages inherit them; confirm whether all 8 files use this wrapper).
- `src/app/components/Header.tsx` (already done — verify mobile-drawer images too)
- `src/app/pages/instructor/InstructorDashboard.tsx`
- `src/app/pages/dashboard/StudentDashboard.tsx`
- `src/app/pages/Profile.tsx`
- `src/app/pages/CourseDetail.tsx`
- `src/app/pages/Checkout.tsx`
- `src/app/pages/Cart.tsx`

**Approach**:
1. Open `ImageWithFallback.tsx` — if it already forwards arbitrary `<img>` props, set defaults `loading="lazy"`, `decoding="async"`. Allow overrides for above-the-fold images (Hero on Home, course header on CourseDetail) by passing `loading="eager"` at the call site.
2. For raw `<img>` tags not going through the wrapper, add the two attrs directly.
3. Add `width` / `height` (intrinsic or styled) wherever the layout has fixed dimensions (avatar, thumbnails, cart line items).

**Acceptance**:
- `grep '<img' src/**/*.tsx` returns zero hits without `loading=` *and* `decoding=`, except explicit eager overrides above the fold.
- Lighthouse "CLS" score on `CourseListing` and `CourseDetail` improves or stays flat.

---

### 7. Form a11y + UX pass `[react-builder]` — **M**

Mirror the Login improvements (`aria-invalid`, `aria-describedby`, `autoComplete`, `aria-busy`, show/hide password, Caps Lock indicator where applicable).

**Files**:
- `src/app/pages/auth/Signup.tsx` — password + confirm-password show/hide, Caps Lock indicator on both, `autoComplete="new-password"`, `aria-invalid` bound to field-level error, `aria-describedby` pointing at the error span id.
- `src/app/pages/auth/ForgotPassword.tsx` — email field with `autoComplete="email"`, aria-invalid, aria-busy on submit button.
- `src/app/pages/auth/SetInitialPassword.tsx` — same password treatment as Signup.
- `src/app/pages/Checkout.tsx` — payment + address fields. `autoComplete` for each (`cc-number`, `cc-exp`, `cc-csc`, `cc-name`, `street-address`, `postal-code`, `country-name`). aria-invalid on validation fail. `aria-busy` on the place-order button.

**Shared helper (optional)**:
- If show/hide-password logic copies 3+ times, extract `src/app/components/ui/PasswordInput.tsx` — composes shadcn `Input` + the toggle button + Caps Lock detection.

**Acceptance**:
- All four pages pass `axe-core` quick scan (no critical / serious issues for the form region).
- Tab-order intuitive on each form.
- Password fields toggle reveal; reveal state announced via `aria-pressed`.
- Submit buttons show `aria-busy="true"` while pending.

---

### 8. Bundle audit + dead-dep removal `[perf-auditor]` — **S**

Confirmed via grep: `@mui/material`, `@mui/icons-material`, `@emotion/react`, `@emotion/styled`, `react-slick`, `react-popper`, `react-responsive-masonry` have **zero imports** in `src/`. Pure dead weight.

**Approach**:
1. Run `grep -r "from '@mui" src/`, `from 'react-slick'`, `from 'react-popper'`, `from 'react-responsive-masonry'`, `from '@popperjs/core'`, `from '@emotion/`, `from 'html2canvas'`, `from 'jspdf'`, `from 'html-to-image'`, `from 'react-dnd'`, `from 'react-day-picker'`, `from 'recharts'`, `from 'embla-carousel-react'`, `from 'vaul'`, `from 'react-resizable-panels'`, `from 'cmdk'`, `from 'input-otp'` — any with zero hits are candidates for removal.
2. Drop the unused entries from `package.json` `dependencies`.
3. Run `pnpm install` (or `npm install` — match what the lockfile says).
4. `pnpm build` to confirm nothing breaks.
5. Report before/after `dist/assets/*.js` gzipped sizes.

**Do not remove**:
- Any package whose grep returns even one hit, no matter how minor.
- Radix `@radix-ui/*` packages without confirming via grep — shadcn primitives in `components/ui/` re-export them.
- `next-themes` — used by `components/ui/sonner.tsx`.

**Acceptance**:
- All confirmed-unused deps removed.
- `pnpm build` succeeds.
- Bundle size report (before / after, gzipped) attached in PR description.

---

### 9. Route lazy-loading `[perf-auditor]` — **M**

`src/app/routes.tsx` eagerly imports all 19 page modules. Convert to `React.lazy()` with `<Suspense>` boundaries.

**Approach**:
- Keep `Layout`, `ProtectedRoute`, `NotFound`, `Login`, `Signup` eager (they're either chrome or first-load destinations).
- Lazy-load: `Home`, `CourseListing`, `CourseDetail`, `Cart`, `Checkout`, `StudentDashboard`, `InstructorDashboard`, `Learn`, `Search`, `Profile`, `Certificate`, `Help`, `AboutUs`, `ContactUs`, `ForgotPassword`, `AuthCallback`, `SetInitialPassword`.
- Wrap each lazy component in a `<Suspense fallback={<PageSkeleton />}>`. Define `PageSkeleton` as a generic full-height skeleton in `components/ui/PageSkeleton.tsx`.
- For routes already wrapped in `<ProtectedRoute>`, the Suspense boundary goes inside the protected wrapper so unauthenticated users still see the redirect immediately.
- Preload `CourseDetail` and `Learn` on hover over a `CourseCard` (call the lazy component's `.preload()` — define a small helper).

**Acceptance**:
- Initial bundle for `/` drops measurably (report before / after in PR description).
- Each lazy page shows a skeleton during chunk load on Slow 3G.
- Navigation back/forward works (no double-fetches; React 18 Suspense should handle).
- `pnpm build` produces separate chunks for the lazy pages (verify in `dist/assets/`).

---

### 10. Toaster + focus polish `[react-builder]` — **S**

Small cleanups.

**Files**:
- `src/main.tsx` — current `<Toaster position="top-right" richColors />`. Update to `<Toaster position="top-right" richColors expand={false} closeButton duration={3500} />`.
- Mobile audit: on viewport ≤ 768px, the sticky Header (`top-0 z-50`) and `top-right` toaster can overlap. Either move the toaster to `position="top-center"` on mobile (sonner doesn't natively switch — use Tailwind `[&_li]:!top-X` overrides or wrap in a media query) or simply confirm visually that there's no overlap with the current Header height.
- Header search dropdown: verify focus returns to the input after Escape (already shipped — confirm).
- Profile tabs: switching tabs should keep focus on the tab list, not jump to the panel. Verify shadcn `Tabs` default behavior matches; if not, add `onValueChange` that re-focuses the trigger.

**Acceptance**:
- Toaster does not overlap the Header on mobile breakpoints (visual check at 375px, 414px, 768px).
- Toast dismiss button visible; toasts dismiss after 3.5s.
- Focus traps verified on Search dropdown (Escape → input) and Profile tabs (Tab key cycles within the panel without escaping to page chrome).

---

## Risks

- **Dark mode + existing pages**: many pages are light-only. Task 2 ships only the chrome; task 2b will catch the rest. Risk: users toggle dark and see half-styled pages between 2 and 2b. Mitigation: ship 2 and 2b in the same PR, or hide the toggle behind a flag until 2b lands.
- **Lazy-loading + tight coupling**: if any page imports from another page module (e.g. `Learn` imports a type from `CourseDetail`), splitting chunks will pull both into the same chunk anyway. Audit cross-page imports during task 9; refactor shared types into `src/app/types/` if needed.
- **Removing MUI from package.json**: zero imports confirmed today, but a future agent might `npm i` something that pulls it back in transitively. Document the removal in the PR description.
- **InstructorDashboard split risk**: 1051-line file likely has shared state across the sub-sections. The hook extraction must preserve referential identity / avoid prop-drilling regressions. The `page-refactorer` agent should diff state usage carefully — no behavior change is the only acceptance criterion.
- **Skeleton primitives drift**: if shadcn's `Skeleton` already exists in `components/ui/skeleton.tsx`, task 3 must reuse it, not create a duplicate.
- **Theme FOUC**: without the inline-script trick in `index.html`, the dark mode flickers light → dark on every load. Mention explicitly in task 2 — don't ship without it.

## Verification steps

After each task PR:
1. `npx tsc --noEmit` exits 0.
2. `pnpm build` succeeds.
3. Manually walk the affected flow (per acceptance criteria above).
4. Lighthouse mobile run on the most-affected page; compare to baseline.

After all tasks land:
1. Full smoke test: signup → login → browse courses → enroll → start learning → take quiz → view certificate → toggle theme on every page.
2. Bundle-size report before / after.
3. Re-grep for `<img` without `loading=` — must be zero hits outside explicit eager overrides.
4. Re-grep for `from '@mui'` and the other removed deps — must be zero hits.

## Order of execution

Dependencies between tasks:

1. **Task 1** (TS errors) — **must land first**. Unblocks all downstream `tsc --noEmit` verification.
2. **Task 3** (skeleton primitives) — should land before task 9 (lazy-loading uses the same primitives in Suspense fallbacks). Can run in parallel with task 1.
3. **Task 2** (theme revive) and **task 2b** (class sweep) — ship in the same PR if practical, else 2 then 2b. Independent of all others.
4. **Task 4** (InstructorDashboard split) — independent. Run in parallel with everything else. Ideally land before task 9 so lazy-loading chunks the new smaller modules.
5. **Tasks 5, 6, 7, 10** — independent polish, any order, parallelizable.
6. **Task 8** (bundle audit) — anytime; clean win.
7. **Task 9** (route lazy-loading) — depends on task 3 (PageSkeleton) and benefits from task 4 (smaller InstructorDashboard chunk). Land last.

Suggested batch order for PRs:
- Wave 1 (parallel): tasks 1, 3, 4, 8.
- Wave 2 (parallel): tasks 2, 2b, 5, 6, 7, 10.
- Wave 3: task 9.

Hand off to: bug-hunter, react-builder, page-refactorer, perf-auditor.
