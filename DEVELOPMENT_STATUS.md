# LinguaAI — Development Status

## Current phase: PHASE 13 — AUTH + SESSION + DATABASE SYNC (complete)

### Root causes (evidence in `docs/AUTH_ROOT_CAUSE.md`)
- No shared auth source: one-shot `getUser()` in `UserMenu` + one-shot fetch in `SmartPathViews` disagreed with the server session.
- No `profiles` auto-create trigger → missing rows, silent 0-row updates, users treated as new every sign-in.
- OAuth callback dropped session cookies on the completed-user redirect to `/dashboard`.
- Post-login always pushed `/onboarding` (AuthForm + login/signup hardcoded); `next` unsanitized/unused.
- Placement page rendered the saved level hint above an untouched test (stale-"A2" look); global storage keys leaked across users with no sign-out cleanup.
- Middleware refreshed cookies but never protected routes; user pages/APIs missed `force-dynamic`/`no-store`.

### Changes
- Session: singleton browser client, `getCurrentUser()`, middleware protection (`/login?next=`, authed off auth pages), `AuthProvider`/`useAuth` seeded from layout + `onAuthStateChange` + `router.refresh()`, `RequireAuth`, account menu in header, `force-dynamic` + `Cache-Control: no-store` on user routes/APIs.
- Routing: `lib/auth/routing.ts` (`sanitizeNext`/`resolveNextPath`) shared by callback/AuthForm/login/signup; rewritten `/auth/callback` (forwarded-host aware, cookies preserved, DB-driven destination).
- DB: `0013_user_state_foundation.sql` (trigger, backfill, typed columns, history, constraints) + `0014_user_state_rpc.sql` (`complete_onboarding`, `save_placement_result`, `get_user_bootstrap`, RLS re-audit). Types + zod schemas extended (backwards compatible).
- Persistence: `lib/auth/storage.ts`, `POST /api/me/migrate-guest` (server wins), per-user flash favorites, sign-out/switch cleanup, resumable onboarding (`onboarding_step` + per-step saves), atomic placement save with legacy fallback, `GET /api/me/bootstrap` + authed `GET /api/me/status`, extended `/api/health` (env booleans, phase 13, commit).
- Profile: "Retake level test" (`/placement?retake=1`, history kept) + "Edit goals" (`/onboarding?edit=1`).

### Verification (Phase 13)
- `npm run typecheck`: clean. `npm run lint`: clean. `npm test`: 193/193 pass (177 existing + 16 new: routing 8, storage 3, schemas 5).
- `npm run build`: clean (new routes `/api/me/bootstrap`, `/api/me/migrate-guest`, `/api/me/status` present).
- i18n parity passes (`placement.retakeHint` added × en/ru/kk).

### Supabase actions for the owner
1. SQL editor → run `0013_user_state_foundation.sql` then `0014_user_state_rpc.sql` (idempotent; `0001` → `0014` in order for fresh projects).
2. Verify: `select count(*) from auth.users;` vs `select count(*) from public.profiles;` (equal after backfill); trigger exists (`select tgname from pg_trigger where tgname='on_auth_user_created';`); RLS enabled on all 15 tables.
3. Vercel Production env: `NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co` (project URL, not a JWT), `NEXT_PUBLIC_SUPABASE_ANON_KEY` (anon key), `NEXT_PUBLIC_APP_URL=https://lingua-ai-project.vercel.app`, plus `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`. Redeploy after env changes (NEXT_PUBLIC vars inline at build).
4. Supabase Auth → URL Configuration: Site URL `https://lingua-ai-project.vercel.app`; Redirect URLs include `https://lingua-ai-project.vercel.app/auth/callback` + `http://localhost:3000/auth/callback`. Google provider enabled; Google Cloud redirect URI = Supabase `/auth/v1/callback`.

---

## Previous phase: PHASE 12 — LISTENING SPEED + PRONUNCIATION + FLASHCARD MODES + VOCAB TOPICS (complete)

### Completed work (Phase 12)
- Listening speed (real): new `src/lib/audio/speed.ts` (0.5/0.75/1/1.25/1.5/1.75/2 ladder, clamp, localStorage persistence `linguaai_playback_speed`, cross-component sync event) + `SpeedMenu` component (`src/components/learn/SpeedMenu.tsx`, accessible listbox, current speed displayed). `speak()` now accepts `{ rate }` and defaults to the saved speed (backward-compatible with `speak(text, lang)`); `stopSpeaking()`/`canSpeak()` added. Listening runner: play button toggles stop, speed menu beside transcript, transcript hidden by default (progressive reveal: listen → answer → inspect) with a "listen first" hint. Same speed + slow-audio (0.6×) wired into flashcards and pronunciation.
- Pronunciation module (new section): `src/lib/pronunciation/drills.ts` — 24 drills A1–C1 (minimal pairs, word/sentence stress, linking & reductions, intonation) each with focus, CAPS stress marks, IPA, coach tip, contrast examples and shadow lines. `/pronunciation` list (search + level + kind filters) + `/pronunciation/[slug]` runner: stress/ipa card, per-line normal/slow audio, on-device recording (MediaRecorder, graceful unsupported state), 1–5 honest self-rating → `POST /api/pronunciation/complete` (zod + 30/min rate limit, inserts `skill_attempts(skill='pronunciation')`, productive-band XP via shared `awardXp`). Nav entry (AudioLines icon), sitemap entry, trilingual strings.
- Flashcards (Quizlet-style upgrade): 4 modes (flip / write-type-the-word / choice / listen-choose), direction (word→meaning / meaning→word / mixed alternation), seeded shuffle toggle, star/favorites with favorites-only filter (localStorage), keyboard shortcuts (Space flip, ←/→ grade, 1–4 choose), slow audio, SpeedMenu, auto-play in listen mode, settings persisted. Pure helpers in `src/lib/vocab/flashcards.ts` (shuffle, sides, distractors, forgiving typed grading).
- Vocabulary: bank 60 → 100 words (20/level) with 7 content topics (everyday/travel/business/academic/technology/education/culture); `wordTopic()`/`listTopics()`; topic filter chips in the explorer; new-word search covered by tests.
- Grammar runner: question shuffle toggle + "Retry N mistakes" narrowing to missed items (uses returned `correctIds`); "Try again" resets without reload.
- Adaptive loop closed for pronunciation: `SKILL_META`/`SKILL_ORDER` + progress scores include pronunciation; Smart Path engine gains weak-skill re-drill branch + fresh-content candidate; `/api/smart-path` resolves drill titles. Migration `0012_pronunciation_skill.sql` widens the `skill_attempts` check (idempotent); `types/database.ts` union updated; README migration list updated.
- i18n: ~60 new keys × en/ru/kk (parity test passes); `/api/health` now reports `phase: 12`.

### Verification (Phase 12)
- `npm run typecheck`: clean. `npm run lint`: clean. `npm test`: 177/177 pass (+13 new: speed 3, drills 4, flashcard helpers 4, vocab topics 1, engine re-drill 1).
- `npm run build`: clean (new routes `/pronunciation`, `/pronunciation/[slug]`, `/api/pronunciation/complete` present).
- Runtime smoke (prod server): `/api/health` ok; `/pronunciation`, `/pronunciation/ship-sheep`, `/flashcards` → 200; invalid pronunciation payload → 400; valid rating=4 → `{score:80, xpEarned:17, saved:false}` (signed-out preview, no keys in this env).

### Known issues / follow-ups (Phase 12)
- Signed-in end-to-end (pronunciation XP/streak/attempt rows, 0012 migration applied, RLS owner checks) still needs a live Supabase project — same standing note as previous phases.
- Self-ratings are honest practice estimates by design, never lab-grade pronunciation scoring; Web Speech recognition deliberately not used (accuracy too uneven across browsers/accents).
- Recording uses MediaRecorder in-browser only; nothing is uploaded.
- Rate limiter still in-memory (Phase 9 note stands); new pronunciation route included (30/min).

### Supabase actions for the owner
1. SQL editor → run `0012_pronunciation_skill.sql` (idempotent; `0001` → `0012` in order for fresh projects).

---

### Completed work (Phase 11)
- Env hardening (`src/lib/env.ts` + `src/lib/env.test.ts`, 4 tests): `isSupabaseUrlValid()` rejects pasted JWTs/keys/whitespace/non-URLs, so a misconfigured `NEXT_PUBLIC_SUPABASE_URL` falls back to the preview-mode warning instead of crashing every Supabase call at runtime. All 30+ `isSupabaseConfigured()` gates inherit the protection.
- SEO: new `src/app/sitemap.ts` (8 public routes that render 200 signed-out) + `src/app/robots.ts` (allows public, disallows `/api/`, `/auth/`, app-private routes).
- Cost/storage hygiene: AI-teacher chat prunes `ai_messages` older than 90 days best-effort after each insert (table otherwise grows 2 rows per exchange, forever).
- Perf: `AnimatedNumber` starts its rAF count-up only when visible (IO-gated + fallback), so below-fold counters no longer burn frames or finish before the user scrolls to them.
- Correctness: `/api/health` reports `phase: 10`; docs fixed to code truth (`GEMINI_MODEL` default is `gemini-3.5-flash-lite`; migrations `0001` → `0011` listed in README).
- DB audit: all 15 tables have owner-only RLS + hot-path composite indexes (verified file-by-file, no new migration needed); smart-path 2000-row dictionary fetch intentionally kept (same rows feed avgMastery + due-word sort in one round trip).

### Verification (Phase 11)
- `npm run typecheck` / `lint` / `test` / `build` all clean (see final report).

### Supabase actions for the owner (require dashboard access — keys never leave it)
1. SQL editor → run `0001` → `0011` in order (all idempotent); **0011 is the critical one** — without `profiles.preferred_language`, language switching signed-in fails.
2. Verify: `select indexname from pg_indexes where schemaname='public' order by tablename,indexname;` (expect ~25 rows incl. `dictionary_entries_user_review_idx`, `skill_attempts_user_slug_idx`) and `select * from pg_tables where schemaname='public';` (15 tables).
3. Vercel → Project → Settings → Environment Variables → Production: `NEXT_PUBLIC_SUPABASE_URL` must be the `https://xxx.supabase.co` project URL (not a JWT), `NEXT_PUBLIC_APP_URL=https://lingua-ai-project.vercel.app`; others unchanged.

---

## Previous phase: PHASE 10 — UI/UX MOBILE + MOTION (complete)

### Completed work (Phase 10)
- Landing fix + rich SaaS story (`a34a84f`): bulletproof `Reveal`/`Stagger` (SSR-visible by default via `initial={false}` + custom in-view hook + fallback timer — content can never stick at `opacity: 0`), full trilingual landing (~150 keys × EN/RU/KK, parity-tested): stats band, 4-step method, 6-card showcase, 4 deep dives with checklists, A1–C1 curriculum table, gamification, LinguaAI-vs-alternatives comparison, 6 testimonials, 8 FAQs, final CTA.
- Design system: `tailwind.config.ts` (brand indigo/violet + warm amber accent, success/warning/danger, dark `class` mode, display/Sora + Inter fonts, radius/shadow/blur scales, shine/float/pulse/shake/waveform keyframes); `globals.css` (CSS vars light/dark, glass + gradient + mesh utilities, safe-area helpers, 100dvh, no horizontal overflow, reduced-motion, 16px iOS inputs). UI kit `src/components/ui/`: upgraded Button (spring press 0.96, hover lift, shine sweep, loading→checkmark morph, haptics), IconButton, Card (glass/elevated/interactive), Badge+Chip, Input+Textarea, Tabs (layoutId pill), Progress (animated) + Ring (animated SVG), Sheet (drag bottom sheet), Modal, Toast, Skeleton, EmptyState, Avatar, Tooltip, Section.
- Motion system `src/lib/motion/`: `tokens.ts` (easings/springs/durations/variants fadeUp/scaleIn/stagger/slideSheet/pageTransition/popIn), `hooks.ts` (useReducedMotion, useCountUp, haptics gated by `linguaai_haptics`), `components.tsx` (PageTransition, Reveal whileInView once, Stagger, AnimatedNumber), `celebrate.ts` (canvas-confetti bursts, big variant for perfect/result, reduced-motion safe). AppShell wraps every authed route in PageTransition; transform/opacity-only animations, 60fps target.
- Landing rewrite `src/app/page.tsx` + `src/components/landing/LandingStory.tsx`: sticky scroll progress, parallax hero with animated headline + live demo quiz (select/shake/pulse + confetti), thumb sticky CTA, problem→promise, 6-feature showcase with CSS phone mockups, A1→C1 timeline, dark gamification (animated XP ring 68/100, 12-day flame, badges), social proof, smooth FAQ accordions, gradient final CTA. SSR-safe (client components prerender), no images/CLS.
- App shell: `Header` (glass, safe-area, contextual title), `Sidebar` (layoutId active pill, dark), `BottomTabBar` (5 tabs Home/Learn/Words/Challenge/Profile, 56px targets, layoutId pill, hide-on-scroll, safe-area, glass), `AppShell` (mesh bg, skip link, desktop sidebar + mobile bar, global PageTransition). PWA: `src/app/manifest.ts` + `public/icons/icon.svg`, `viewportFit: cover`, dual theme-color, `/offline` fallback. `ThemeProvider` (system/light/dark persisted `linguaai_theme`) + `ThemeToggle` in headers + `AppearanceSettings` (theme/reduced-motion/haptics switches) on Profile.
- Screens: Dashboard (PageHero, animated streak/XP ring/counters, snap carousels, SmartPath preview), Placement (one-per-screen slide transitions, big QuizOptions, sticky action bar, confetti level reveal), Flashcards (3D flip spring + drag swipe ←/→ with sticky Known/Review bar), Practice/Grammar/Reading/Listening runners (QuizOption select/correct/wrong states, sticky submit bars, progress, confetti on perfect; reading adds S/M/L type + tap-to-peek Sheet; listening adds 64px play button, waveform, per-line highlight, mobile dictation textarea), Vocabulary (sticky search + snap Chip rows, staggered WordCards, waveform audio, bookmark pop + optimistic saves), Onboarding (slide steps, big goal/mode cards, sticky nav), Auth (AuthShell gradient cards, 44px targets), Profile (avatar hero + appearance card), Vocabulary header (gradient level cards). Business logic, APIs, XP/streak/grading untouched.
- Locales: added `nav.profile` (en/ru/kk) for the tab bar; parity test still passes.

### Verification (Phase 10)
- `npm run typecheck`: clean. `npm run lint`: clean. `npm test`: 161/161 pass. `npm run build`: clean (First Load ~260–274 kB, +~50 kB framer-motion/confetti; shared 87.2 kB).
- Manual: landing/dashboard/placement/flashcards/vocab verified via build smoke; 360–1440px + light/dark via responsive utilities (min-w-0/truncate, snap, safe-area, 100dvh); no horizontal overflow (overflow-x clip); focus-visible + aria preserved.

### Known issues (Phase 10)
- No Playwright/axe e2e yet (same as Phase 9 follow-up); contrast/keyboard verified manually via existing patterns.
- Full SW offline caching not added (manifest + offline page only); add workbox/PWA plugin as follow-up.
- Rate limiter still in-memory (Phase 9 note stands).

### Next phase
- Production launch checks + optional Redis limits, Playwright mobile screenshots (360/390/430/768/1024/1440 × light/dark), Lighthouse 90+ pass, SW precache.

---

## Previous phase: PHASE 9 — FINAL QA (complete)

### Completed work (Phase 9)
- API hardening (`src/lib/api/security.ts` + 3 tests): shared `apiError`, `getClientIp`, in-memory fixed-window `checkRateLimit` (429 + `Retry-After`). Wired into AI-cost routes: `POST /api/ai-teacher/chat` (15/min), `POST /api/writing/check` (10/min), `POST /api/vocab/translate` (20/min).
- Security headers (`next.config.mjs`): `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy` (mic self-only for speaking/read-aloud), HSTS; `poweredByHeader: false`. Secret audit: `GEMINI_API_KEY` + `SUPABASE_SERVICE_ROLE_KEY` only read server-side (`src/lib/gemini/client.ts`, route handlers); client uses only `NEXT_PUBLIC_` keys.
- Error/UX polish: new `src/app/error.tsx` (retry + digest), `global-error.tsx`, `not-found.tsx` (dashboard/home links), `loading.tsx` (accessible spinner). Layout gains `viewport` export (device-width, theme-color) — build warning-free.
- RLS audit: new `supabase/migrations/0010_phase9_rls_audit.sql` (idempotent) re-enables RLS on all 15 tables and recreates owner-only policies matching Phases 0–8 behavior. Apply `0001` → `0010` in order.
- Health fix: `/api/health` reported stale `phase: 2` → now `phase: 9`.

### Changed files (Phase 9)
- New: `src/lib/api/{security,security.test}.ts`, `src/app/{error,global-error,not-found,loading}.tsx`, `supabase/migrations/0010_phase9_rls_audit.sql`.
- Edited: `next.config.mjs` (headers), `src/app/layout.tsx` (viewport), `src/app/api/health/route.ts` (phase), `src/app/api/{ai-teacher/chat, writing/check, vocab/translate}/route.ts` (rate limits). This file.

### Database changes (Phase 9)
- `0010_phase9_rls_audit.sql`: no schema change; hardening only (RLS on + owner policies). Apply `0001` → `0010` in order.

### Environment variables (Phase 9)
- No new vars. Same contract: `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` (client-safe), `GEMINI_API_KEY` + `SUPABASE_SERVICE_ROLE_KEY` server-only, `GEMINI_MODEL` default `gemini-3.5-flash-lite` (corrected — was misstated before).

### Tests (Phase 9)
- `npm test`: 144/144 pass (was 141: +3 security tests — limit/429+Retry-After, per-IP isolation, forwarded-IP parsing).
- `npm run typecheck`: clean. `npm run build`: clean, zero metadata warnings (was N themeColor warnings).
- Runtime smoke test (prod server :3100): `GET /api/health` → ok/phase 9; `POST /api/vocab/translate` ×21 → 21st returns 429 with Retry-After; pages `/does-not-exist` (custom 404), `/dashboard`, `/smart-path` → 200; security headers present on `/`.

### Known issues (Phase 9)
- Rate limiter is in-memory per instance — correct for single-instance; use Redis/Upstash for multi-instance prod.
- Signed-in RLS end-to-end (all 15 tables as authenticated user) still needs a live Supabase project; verify with keys: each table denies anon cross-user reads, policies from 0010 match app queries.
- No automated a11y/e2e suite (keyboard/contrast verified manually via skip-link, aria-current nav, focus-visible styles, reduced-motion CSS); consider adding Playwright + axe in a follow-up.

### Next phase
- Production launch: apply migrations `0001` → `0010`, set env vars, verify signed-in flows, optionally add Redis rate limits + Playwright/axe e2e.

---

## Previous phase: PHASE 8 — SMART PATH (complete)

### Completed work (Phase 8)
- Adaptive engine (`src/lib/smart-path/engine.ts`, deterministic, zero Gemini tokens): builds an ordered 1–5 step "today" plan (≤45 min) from level, weak skills, mistakes, vocabulary mastery, review schedule and learning history. Priority: due-word review → Daily Challenge → weakest skill (worst-scoring topic/passage/track retried first; steps down one level when accuracy <40%) → concrete mistakes (worst slug, recurring writing-error category, most-missed spelling word) → stale productive skill rotation (writing/speaking untouched ≥5 days) → fresh at-level content (recently attempted slugs/modules deprioritized). Never repeats a destination; deterministic (same input → same plan); `buildPreviewSmartPath` for signed-out visitors.
- API `GET /api/smart-path`: aggregates profile, `skill_attempts` (per-slug accuracy), writing/speaking/read-aloud/spelling attempts (reusing the summary's `computeSkillScores`/`findWeakAreas`), `writing_errors` categories, spelling misses, dictionary entries due via `isDue(next_review_at, today)` in the learner's timezone, 7-day activity/slug recency, productive-skill recency, today's XP + challenge state. Returns `{ steps, meta, signals, reviewQueue }`; preview plan when signed out/unconfigured.
- UI: `/smart-path` page + `SmartPathViews` (numbered steps with kind/level badges, reasons, minutes/XP estimates, Start links; "Why this path" card explaining review/weak-skill/mastery/error signals + due-word chips; loading skeleton, error+retry, signed-out and empty states). Dashboard `SmartPathCard` shows top-3 steps + link. Sidebar has a Smart Path entry (Compass icon).
- Fixed dead link: `/guided-path` had no page (sidebar + dashboard + recommendations link to it) — now redirects to `/smart-path`, the adaptive successor.

### Changed files (Phase 8)
- New: `src/lib/smart-path/{engine,engine.test}.ts`, `src/app/api/smart-path/route.ts`, `src/app/smart-path/page.tsx`, `src/app/guided-path/page.tsx` (redirect), `src/components/smart-path/SmartPathViews.tsx`.
- Edited: `src/lib/constants.ts` (Smart Path nav), `src/components/layout/Sidebar.tsx` (Compass icon), `src/components/dashboard/DashboardCards.tsx` (SmartPathCard), `src/app/dashboard/page.tsx` (card placement). This file.

### Database changes (Phase 8)
- None. The engine reads existing tables only (`profiles`, `skill_attempts`, `writing_submissions`, `writing_errors`, `speaking_attempts`, `read_aloud_attempts`, `spelling_attempts`, `dictionary_entries`, `daily_challenge_completions`, `xp_events`, `activity_events`). Performance influences future plans through those tables — no new migration. Apply `0001` → `0009` in order as before.

### Environment variables (Phase 8)
- No new vars. Engine is deterministic (no Gemini calls); preview works without keys. Signed-in plans need `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

### Tests (Phase 8)
- `npm test`: 141/141 pass (was 126: +15 engine tests).
- New coverage: step-down floors at A1; `pickContent` prefers unattempted slugs, remediates down a level, falls back to nearest level; review-first ordering; challenge inclusion; weakest-skill slug targeting; <40% remediation; writing-error mistake step; stale productive nudge; recent-slug avoidance; new-learner non-empty plan; 5-step/45-min cap with unique hrefs; determinism; preview plan.
- `npm run typecheck`: clean. `npm run build`: clean (routes `/smart-path`, `/guided-path`, `/api/smart-path` present).
- Runtime smoke test (prod server): `GET /api/smart-path` signed-out → preview plan (4 steps, real slugs: `/vocabulary`, `/reading/morning-routine`, `/grammar/articles-a-an-the`); pages `/smart-path`, `/dashboard`, `/progress` → 200.

### Known issues (Phase 8)
- Signed-in aggregation (per-slug accuracy, due-word queue, error/miss signals, recency windows) not exercised end-to-end here — no Supabase keys in this environment. Verify signed in: weak grammar topic retried first; due words appear with correct counts; completed modules disappear from the next plan.
- Engine consumes existing attempts only; modules that never record attempts (e.g. AI Teacher chats) do not influence the plan.
- Plan XP values are estimates ("up to ~N XP"); actual awards follow per-module XP rules.

### Next phase
- PHASE 9 — FINAL QA (Security, RLS, performance, mobile/desktop testing, accessibility, error handling, API reliability, build validation and complete UX polish).

---

## Previous phase: PHASE 7 — SPELLING + GAMIFICATION (complete, compliance pass)

### Completed work
- Spelling engine (`src/lib/spelling/spelling.ts`, deterministic, zero tokens): 4 modes using the Phase-3 vocabulary bank — Listen & Type (browser TTS + typed answer), **Write from Meaning** (definition + example → type word, new), Missing Letters (deterministic 1–3 hidden letters, first letter visible), Pick Correct (correct spelling + 3 deterministic misspellings). Level filter, dictionary words (lowest mastery) preferred, count clamped 4–12, case-insensitive grading.
- **Central XP config** (`src/lib/gamification/xp-rules.ts`): single source of truth — spelling/vocab 5+10, challenge 10+10, grammar 5+10, reading/listening 8+10, dictation exact 5, productive bands 8/12/17/22, challenge-attempt 1 — plus `xpFromBands`/`xpForGradedSet` helpers. All modules (spelling, vocab practice, daily challenge, grammar, reading, listening, speaking, writing) read from it; legacy constant names kept as re-exports so existing tests/APIs are untouched.
- **Idempotent spelling XP**: `spelling_sessions` table (unique user+session) + unique `(session_id, word)` on attempts; `POST /api/spelling/complete` returns the stored grade with `repeated:true, xpAwarded:0` on re-submit (incl. race-safe path), awards XP exactly once. Pure `repeatedSessionResult()` helper; client generates a session id per set and shows “already counted, no extra XP”.
- **Timezone-aware streaks/challenges**: `profiles.timezone` (IANA, default UTC, editable in Profile with browser-detected default); `streak.ts` gains `isValidTimezone`, `dateKeyInTimezone`, `todayKeyTz`, `startOfDayUtc` (DST-safe). `awardXp`, dashboard queries, challenge GET/complete, and gamification summary all use the learner’s day (±1-day tolerance on challenge submit for travel/stale pages).
- **Daily Challenge skill mix**: pool extended to 23 questions across 5 kinds — vocab 6, grammar 6, spelling 5 (choices built by the spelling engine), reading 3, listening 3. Every daily set contains exactly one question per skill, deterministically rotated; UI shows per-question skill badges.
- **Progress skill scores**: summary aggregates `skill_attempts` + writing/speaking/read-aloud/spelling/dictionary mastery into per-skill accuracy, `findWeakAreas` (<70% first, then unstarted, max 3), and mastery distribution. `/progress` renders Skill scores + Weak areas cards (honest “in-app analytics” disclaimer, null-safe empty states).
- Persistence + XP wiring: spelling completion awards XP/streak/activity via shared `awardXp` and auto-unlocks spelling/XP/first-steps badges; Daily Challenge completion unlocks `warm-up` + `perfect-day`.
- APIs: `GET /api/spelling/set` (4 modes, dictionary-preferred), `POST /api/spelling/complete` (idempotent), `GET /api/gamification/summary` (XP, streak, goal, level, achievements, last-7-days XP in user TZ, skills, weak areas, mastery), `PATCH /api/gamification/goal`, `PATCH /api/profile` (+timezone).
- UI: `/spelling` with 4 mode tabs, level filter, TTS playback, per-word review + “save missed words to dictionary”. `/progress` with level/streak-7-day/goal-setter/skills/weak-areas/achievements. Sidebar has Progress; dashboard XP card links to `/progress`; profile form has timezone selector.

### Changed files
- New: `supabase/migrations/0009_phase7_compliance.sql`, `src/lib/gamification/xp-rules.ts`.
- Lib: `src/lib/spelling/{spelling,spelling.test}.ts` (meaning mode, XP_RULES, repeatedSessionResult), `src/lib/spelling/schemas.ts` (meaning), `src/lib/gamification/{gamification,gamification.test}.ts` (skill scores, weak areas, mastery), `src/lib/dashboard/{daily-challenge,streak,award,queries,dashboard.test}.ts` (pool mix, TZ, XP_RULES), `src/lib/{vocab/practice,grammar/topics,reading/library,listening/library,speaking/analyze,writing/analyze}.ts` (XP_RULES), `src/lib/auth/schemas.ts` (+timezone).
- API: `spelling/{set,complete}`, `daily-challenge/{route,complete}`, `gamification/summary`, `profile` (timezone patch).
- UI: `SpellingViews` (meaning UI, session id, repeated state), `DailyChallengeRunner` (skill badges), `ProgressViews` (skills + weak areas), `ProfileForm` + `/profile` (timezone), `DashboardCards` (progress link).
- Types: `database.ts` (profiles.timezone, spelling_sessions, meaning mode). This file.

### Database changes
- `0009_phase7_compliance.sql`: `profiles.timezone text default 'UTC'`; `spelling_sessions` (unique user+session + owner RLS); unique `(session_id, word)` on `spelling_attempts`; widens the 0008 mode check to `('listen','meaning','missing','choice')`. Apply `0001` → `0009` in order.

### Environment variables
- No new vars. Everything runs without keys (preview grading, signed-out states). Persistence needs `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Spelling TTS is browser speechSynthesis (no key, no uploads).

### Tests
- `npm test`: 126/126 pass (was 102: +3 meaning/idempotency, +8 challenge mix + pool validity, +5 TZ, +8 XP-rules/skills/weak-areas).
- New coverage: meaning set/grade; `repeatedSessionResult` (stored grade, zero new XP); 5-kind mix on 14 sampled dates + pool validity (4 choices, in-range answer, unique); TZ validation, day-boundary dates (NY/Berlin/Kiritimati), invalid-zone fallback, `startOfDayUtc` (Berlin midnight = 22:00Z), challenge uniqueness per set; XP_RULES values, band boundaries, graded-set math; skill aggregation incl. unknown-skill filtering, vocabulary mastery seeding, weak-area ranking/cap, empty-strong case.
- `npm run typecheck`: clean. `npm run build`: clean (routes `/spelling`, `/progress`, `/api/spelling/*`, `/api/gamification/*` present).
- Runtime smoke test (prod server): `GET /api/spelling/set?mode=meaning` → definitions, perfect typed submit → 4/4 +30 XP `saved:false`; `GET /api/daily-challenge` → one question per skill (s3/r2/l3/v4/g5); pages `/spelling`, `/progress`, `/profile` → 200.

### Known issues
- Signed-in DB paths (spelling session idempotency incl. concurrent double-submit, achievement unlocks, goal setter, TZ-aware streak across midnight, skill aggregation) not exercised end-to-end here — no Supabase keys in this environment. Verify signed in: submit same spelling session twice (second returns `repeated:true`, XP counted once); change timezone and complete an activity near UTC midnight (streak date follows local day); progress shows skill cards after grammar/reading/listening attempts.
- Challenge ±1-day tolerance means a learner can hold completions for two adjacent dates (by design, for travel); the per-(user,date) unique constraint still prevents same-day doubles.
- `startOfDayUtc` uses the offset at local noon (correct except for the rare zones with midnight DST transitions).
- Daily Challenge has no Speaking/Writing free-response parts (not deterministically gradeable) — reading/listening comprehension stand in for receptive skills; productive skills feed XP/streak via their own modules.

### Next phase
- PHASE 8 — SMART PATH (Adaptive learning engine based on level, weak skills, mistakes, vocabulary mastery, review schedule and learning history; can now consume `skills`/`weakAreas`/`mastery` from the summary API).
