# LinguaAI
Personalized AI-powered English learning (A1–C1). Mobile-first premium app shell with motion.
## Quickstart
```bash
cp .env.example .env   # fill in keys
npm install
npm run dev            # http://localhost:3000
```
## Scripts
`dev` / `build` / `typecheck` (`tsc --noEmit`) / `lint` (`next lint`) / `test` (Vitest).
## Design system (Phase 10)
Tokens in `tailwind.config.ts` + `src/app/globals.css` (light/dark, Inter + Sora, glass/gradients, safe-area, 100dvh). UI kit in `src/components/ui/` (Button motion press/shine, Card, Tabs, Progress+Ring, Sheet bottom sheet, Toast, Skeleton, Avatar, Section). Motion in `src/lib/motion/` (page transitions, reveals, counters, confetti). Shell: bottom tab bar (Home/Learn/Words/Challenge/Profile, hide-on-scroll) + desktop sidebar, theme toggle (`linguaai_theme`), reduced-motion + haptics settings on Profile. Landing is a scroll story (`src/components/landing/LandingStory.tsx`). PWA manifest + `/offline`.
## Environment
See `.env.example`. Server-only: `GEMINI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. Public: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
## Google OAuth (Phase 1) — production настроен
Код: `src/components/auth/AuthForm.tsx` (`signInWithOAuth provider google`,
`redirectTo: <origin>/auth/callback?next=/onboarding`), обмен кода — `src/app/auth/callback/route.ts`.
1. Google Cloud Console → Credentials → OAuth client ID (Web): Authorized redirect URI
   `https://ekeubyepwustjhzuthkd.supabase.co/auth/v1/callback`. Взять Client ID + Client Secret.
2. Supabase Dashboard → Authentication → Sign In / Providers → Google → Enable,
   вставить Client ID (только `xxx.apps.googleusercontent.com`, без `https://`) + Secret → Save.
3. Supabase → Authentication → URL Configuration: Site URL `https://lingua-ai-project.vercel.app`;
   Redirect URLs: `https://lingua-ai-project.vercel.app/auth/callback` и `http://localhost:3000/auth/callback`.
4. Vercel Production env: `NEXT_PUBLIC_APP_URL=https://lingua-ai-project.vercel.app` (+ остальные 5 из `.env.example`).
Секреты (Client Secret, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`) только в `.env.local` и Vercel env — никогда в git.
## Database
Apply migrations in order in Supabase SQL editor (or `supabase db push`):
- `supabase/migrations/0001_foundation.sql` — `profiles`, `xp_events`, `dictionary_entries` with owner-only RLS.
- `supabase/migrations/0002_phase1_auth_onboarding.sql` — onboarding fields + `placement_results`.
- `supabase/migrations/0003_phase2_dashboard.sql` — profile XP/streak counters + `activity_events` + `daily_challenge_completions` with owner-only RLS.
- `supabase/migrations/0004_phase3_vocab.sql` — `dictionary_entries` word metadata (definition, level, phonetic, example, translation, source), review stats (`review_count`, `correct_count`, `last/next_review_at`) + indexes.
- `supabase/migrations/0005_phase4_skills.sql` — `skill_attempts` (skill, slug, score, total, xp_earned) with owner-only RLS for grammar/reading/listening/dictation history.
- `supabase/migrations/0006_phase5_writing.sql` — `writing_submissions` + `writing_errors` + `ai_messages` with owner-only RLS and user indexes.
- `supabase/migrations/0007_phase6_speaking.sql` — `speaking_attempts` + `read_aloud_attempts` with owner-only RLS and user/topic indexes.
- `supabase/migrations/0008_phase7_spelling_gamification.sql` — `spelling_attempts` + `achievements` with owner-only RLS.
- `supabase/migrations/0009_phase7_compliance.sql` — `profiles.timezone`, `spelling_sessions` (idempotent XP), unique `(session_id, word)`.
- `supabase/migrations/0010_phase9_rls_audit.sql` — re-enables RLS on all 15 tables, recreates owner-only policies (idempotent).
- `supabase/migrations/0011_i18n_preferred_language.sql` — `profiles.preferred_language` (kk/ru/en check).
- `supabase/migrations/0012_pronunciation_skill.sql` — widens `skill_attempts.skill` to include `pronunciation` (+ speaking/writing/spelling/vocabulary for future modules).
- `supabase/migrations/0013_user_state_columns.sql` — typed profile columns (`onboarding_step`, `placement_completed`, `level_source`, goals/targets/skills/interests, `avatar_url`, `preferences`), placement history columns + `set_updated_at()`.
- `supabase/migrations/0014_user_state_rpc.sql` — atomic RPC (`complete_onboarding`, `save_placement_result`, `get_user_bootstrap`) + RLS re-audit on all 15 tables.
- `supabase/migrations/0015_user_state_trigger_backfill.sql` — `handle_new_user()` trigger + backfill (a profile for every auth user), integrity checks, attempt numbering, completion backfill.
Apply `0001` → `0015` in order (0013 → 0014 → 0015 for the new ones); every file is idempotent and ends with an `OK-00XX` proof row — if you do not see it, the paste was truncated, re-copy the entire file.
## Auth + session architecture (Phase 13)
Cookie sessions via `@supabase/ssr` everywhere (singleton `lib/supabase/client.ts`, `lib/supabase/server.ts`, service-role `lib/supabase/service.ts` server-only). `src/middleware.ts` refreshes the session with `getUser()` and protects app routes (`/login?next=` for anonymous, authed users off `/login`/`/signup`). Server truth: `getCurrentUser()` (`lib/auth/session.ts`); client truth: `AuthProvider`/`useAuth` seeded from the root layout (no flash) + `onAuthStateChange` + `router.refresh()`; gates use `RequireAuth` (skeleton while loading, sign-in card only when anonymous). Post-auth destination: `lib/auth/routing.ts` (`sanitizeNext`/`resolveNextPath`) shared by `/auth/callback`, `AuthForm`, `/login`, `/signup`. Shell hydration: `GET /api/me/bootstrap` (no-store); diagnostics: `/api/health` (env booleans, no secrets) + authed `GET /api/me/status`. Storage policy: device-only prefs may stay local; account data lives in Postgres; guest words migrate once via `POST /api/me/migrate-guest` (server wins), user-scoped keys cleared on sign-out/switch (`lib/auth/storage.ts`).
## Auth + onboarding flow (Phase 13)
`/signup` → `/onboarding` (resumable via `onboarding_step`, per-step saves) → `/placement` (20 questions, A1–C1, atomic `save_placement_result`; retakes append history) → `/dashboard`. Returning users skip finished steps via `resolveNextPath`; `/login?next=` preserves deep links; `/profile` offers "Retake level test" (`/placement?retake=1`) and "Edit goals" (`/onboarding?edit=1`). `/auth/callback` exchanges OAuth codes, preserves cookies on the final redirect, and routes by DB state.
## Dashboard (Phase 2)
`/dashboard` (streak, XP vs daily goal, Continue Learning, Word of the Day, recommendations, Daily Challenge card) + `/daily-challenge` (5 questions/day, XP + streak). APIs: `GET /api/dashboard`, `POST /api/xp`, `GET /api/daily-challenge`, `POST /api/daily-challenge/complete`, `POST /api/recommendations` (optional Gemini enhance, rule-based fallback).
## Vocabulary + dictionary (Phase 3)
60-word deterministic bank (12 per level, `src/lib/vocab/bank.ts`) with phonetics, learner-friendly definitions and examples.
`/vocabulary` (search, level/type filters, audio via Web Speech API, save/unsave) → `/vocabulary/[word]` (detail, mastery, lazy translation, related words) → `/dictionary` (search, mastery/level filters, sort, remove) → `/flashcards` (spaced repetition: due first; +3 XP known / +1 XP attempt) → `/vocabulary/practice` (8-question quiz from saved low-mastery words first; +5 XP each, +10 bonus; gentle mastery nudge).
APIs: `GET /api/vocab`, `GET/POST/PATCH/DELETE /api/dictionary`, `POST /api/vocab/translate` (one compact Gemini call per tap, cached to the entry), `GET /api/flashcards`, `POST /api/flashcards/review`, `GET /api/vocab/practice`, `POST /api/vocab/practice/complete` (server-side grading — answers never leave the server).
Preview mode without keys: bank browsing, localStorage saves, preview flashcard deck and ungraded-persistent practice all work; sign-in gates persistence.
## Grammar + reading + listening (Phase 4)
Deterministic, zero-Gemini libraries: 15 grammar topics (3 per level, `src/lib/grammar/topics.ts`), 10 reading passages (2 per level, `src/lib/reading/library.ts`), 10 listening tracks (dialogue/monologue/podcast, `src/lib/listening/library.ts`).
`/grammar` → `/grammar/[slug]` (lesson + 5-question quiz; +5 XP each, +10 perfect bonus) · `/reading` → `/reading/[slug]` (passage with vocabulary-linked highlights + comprehension; +8 XP each, +10 bonus) · `/listening` → `/listening/[slug]` (device TTS audio, transcript mode, per-line play, dictation with forgiving grading +5 XP exact, comprehension +8 XP each +10 bonus).
APIs: `GET /api/grammar`, `GET /api/grammar/[slug]`, `POST /api/grammar/complete`, `GET /api/reading`, `GET /api/reading/[slug]`, `POST /api/reading/complete`, `GET /api/listening`, `GET /api/listening/[slug]`, `POST /api/listening/complete`, `POST /api/listening/dictation` (all server-side grading — answers never leave the server; signed-out users get graded preview without persistence). Completions record `skill_attempts` + XP/streak via shared `awardXp()`. Reading/listening texts reuse the Phase-3 vocabulary bank (`vocabFocus` words link to `/vocabulary/[word]`).
Audio note: listening playback uses the Web Speech API (device TTS, no key needed). To upgrade to studio audio, replace `speak()` calls in `ListeningRunner` with file/signed-URL playback — the transcript, dictation and grading layers are already audio-source agnostic.
