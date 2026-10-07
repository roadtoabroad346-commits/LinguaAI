# LinguaAI
Personalized AI-powered English learning (A1–C1).
## Quickstart
```bash
cp .env.example .env   # fill in keys
npm install
npm run dev            # http://localhost:3000
```
## Scripts
`dev` / `build` / `typecheck` (`tsc --noEmit`) / `lint` (`next lint`) / `test` (Vitest).
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
## Auth + onboarding flow (Phase 1)
`/signup` → `/onboarding` (profile, goals, Guided/Free) → `/placement` (20 questions, A1–C1) → `/dashboard`. `/login` for returning users; `/profile` to view/edit; `/auth/callback` handles OAuth code exchange.
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
