# Flashcards Pro — Vocabulary Studio

Personal vocabulary workspace. Source of truth for **custom sets** is
`vocab_sets` / `vocab_cards` / `vocab_reviews`. The legacy
`dictionary_entries` table (bank-word saves) is preserved untouched for
backward compatibility; Smart Path, notifications and stats read **both**.

## Scheduling algorithm (FSRS-lite / SM-2-lite hybrid)

Implemented in `src/lib/vocab-studio/scheduler.ts`, tested in
`scheduler.test.ts`. This is a documented heuristic — **not** claimed as
scientifically validated.

- Ratings: `again` (forgot), `hard`, `good`, `easy`.
  Legacy booleans map: `known → good`, `unknown → again`.
- `again`: mastery −20, ease −0.2 (floor 1.3), interval → 0 (due
  tomorrow), status → `relearning` (`learning` if new), lapses +1.
- `hard`: mastery +8, ease −0.05, interval ×1.2 (min 1 day).
- `good`: mastery +15, interval 1→3→7→×ease (cap 180 days).
- `easy`: mastery +25, ease +0.1 (cap 3.0), interval ×ease×1.3 (min 2 days).
- **Mastery criteria (explicit):** `mastery ≥ 80` AND `review_count ≥ 3`
  AND `correct/review ≥ 75%`. Viewing a card never counts — only graded
  reviews via `POST /api/vocab-reviews` change state.
- `next_review_at` is a UTC `YYYY-MM-DD` date key; "due today" compares
  against the caller's local date key (timezone-safe).
- Idempotency: `vocab_reviews(user_id, idempotency_key)` is unique; repeat
  POSTs return the original result without double XP/scheduling.
- XP per rating: again 1, hard 2, good 3, easy 4 (extends legacy
  `reviewXp`: known 3 / review 1).

## API

| Route | Purpose |
|---|---|
| `GET/POST /api/vocab-sets` | list (search/sort/filter + aggregates) / create |
| `GET/PATCH/DELETE /api/vocab-sets/[id]` | set + cards / rename / archive / delete |
| `POST /api/vocab-sets/[id]/duplicate` | deep copy (cards reset to `new`) |
| `GET/POST /api/vocab-sets/[id]/cards` | list / add (409 on duplicate word) |
| `PATCH/DELETE/POST /api/vocab-sets/[id]/cards/[cardId]` | edit / delete / duplicate card |
| `POST /api/vocab-sets/[id]/import` | `quick` (multiline) / `csv` / `json`, modes `skip\|update\|import` |
| `GET /api/vocab-sets/[id]/export?format=csv\|json` | owner-only download |
| `GET /api/vocab-sets/[id]/study?mode=due\|all\|difficult\|new` | ordered study queue |
| `POST /api/vocab-reviews` | idempotent graded review + XP |
| `GET /api/vocab-studio/stats` | real analytics (never fabricated) |
| `GET/POST /api/vocab-studio/ai-assist` | Gemini suggestions, 503 when unconfigured |

All routes enforce ownership server-side (`auth.getUser()` + `user_id`
equality). Client-provided user IDs are never trusted.

## Import rules

- Max 500 rows / 1 MB per import; quoted CSV fields, `""` escapes,
  ragged rows and empty files handled in `src/lib/vocab-studio/csv.ts`.
- Every row validated with zod before insert; summary reports
  `{ inserted, updated, skipped, errors, total }` only after persistence.
- Sets are private by default (RLS owner-only, no public sharing).

## AI configuration

Reuses the existing Gemini layer (`src/lib/gemini/client.ts`).
Set `GEMINI_API_KEY` (and optional `GEMINI_MODEL`, see `.env.example`).
Without a key, `/api/vocab-studio/ai-assist` returns `503` with setup
instructions and the UI shows a graceful disabled state. AI output is
**always** returned for human review — it never overwrites card fields
automatically, and CEFR is labeled an estimate.

## Database

Migration `supabase/migrations/0019_vocab_studio.sql` (additive,
reversible: drop `vocab_reviews`, `vocab_cards`, `vocab_sets` in that
order). Apply with `supabase db push` or paste into the Supabase SQL
editor. RLS: owner-only policies on all three tables; indexes on
`(user_id, …)` for list/review/queue queries.

## Pages

- `/flashcards` — Flashcards Pro dashboard (sets library + real stats);
  classic bank runner still available at `/flashcards?view=classic`.
- `/vocab-sets/[id]` — set detail: meta editor, card CRUD, import/export.
- `/vocab-sets/[id]/study` — 5 working modes (flashcards, active recall
  with Again/Hard/Good/Easy, multiple choice, typing, matching) +
  queues (due/all/difficult/new), keyboard shortcuts, touch controls,
  session summary.
