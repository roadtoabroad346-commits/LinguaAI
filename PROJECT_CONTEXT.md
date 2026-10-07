# LinguaAI — Project Context
AI-powered English learning SaaS for A1–C1 students.
## Learning loop
ASSESS → PERSONALIZE → LEARN → PRACTICE → FEEDBACK → REVIEW → IMPROVE
User performance influences future recommendations (Smart Path, Phase 8).
Vocabulary connects across: Vocabulary → Dictionary → Reading → Listening → Speaking → Writing → Spelling.
## Rules
- Deterministic logic wherever AI is unnecessary.
- Minimize Gemini calls/tokens: compact prompts, server-only key, only user-relevant context.
- API keys from env vars only. `GEMINI_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are server-only (no `NEXT_PUBLIC_` prefix).
- Supabase backend (auth, Postgres, RLS). Gemini via `src/lib/gemini/client.ts` (server-only).
## Stack (Phase 0)
- Next.js 14 App Router + TypeScript + Tailwind CSS
- Supabase (`@supabase/ssr`, `@supabase/supabase-js`)
- Gemini (`@google/generative-ai`, server-only)
- Vitest, Zod env validation
## Routes (Phase 0)
- `/` marketing landing, `/dashboard` app-shell foundation, `/login` Phase-1 placeholder, `/health` + `/api/health` status.
## Design system
`src/components/ui/`: `Button` (+Spinner, motion press/shine/loading morph), `IconButton`, `Card` (default/glass/elevated/interactive), `Input`+`Textarea`, `Badge`+`Chip`, `Tabs` (layoutId), `Progress`+`Ring`, `Sheet` (bottom sheet), `Modal`, `Toast`, `Skeleton`, `EmptyState`, `Avatar`, `Tooltip`, `Section`. Layout: `Header` (glass, safe-area), `Sidebar` (layoutId active), `BottomTabBar`/`MobileNav` (5 tabs, hide-on-scroll, safe-area), `AppShell` (mesh bg + global PageTransition). Tokens in `tailwind.config.ts` (brand/ink/accent/success/warning/danger, dark class, fonts, keyframes) + CSS vars in `globals.css`. Motion in `src/lib/motion/` (tokens/hooks/components/celebrate). Theme via `ThemeProvider` (`linguaai_theme`) + `AppearanceSettings` (theme/reduced-motion/haptics).
