# LinguaAI — Architecture (Phase 0)
```
src/
  app/ page.tsx, layout.tsx, globals.css, dashboard/page.tsx, login/page.tsx, health/page.tsx, api/health/route.ts
  components/ui/ Button, Card, Input, feedback (Badge/Progress/Alert/EmptyState)
  components/layout/ Header, Sidebar, AppShell
  lib/ constants.ts, utils.ts (cn), env.ts, supabase/{client,server,middleware}.ts, gemini/client.ts (SERVER-ONLY)
  middleware.ts (Supabase session refresh)
  types/database.ts (minimal table types; replace with `supabase gen types` later)
supabase/migrations/0001_foundation.sql (profiles, xp_events, dictionary_entries + RLS)
```
## Decisions
- Next.js App Router: routing + API routes keep secrets server-side.
- `@supabase/ssr` browser/server/middleware trio; middleware tolerates missing keys so landing boots without env.
- `GEMINI_API_KEY` only read in `src/lib/gemini/client.ts` (Route Handlers / Server Actions, never client).
- Deterministic-first: `deterministicFallback()` for rule-based paths.
- RLS deny-by-default, owner-only policies on all foundation tables.
## Adding a phase
1. Add `src/app/<module>/page.tsx` inside `AppShell` (global PageTransition + mesh bg included). 2. Reuse `ui/` + `learn/` (`QuizOption`, `StickyActionBar`, `PageHero`, `Sheet`, `Tabs`, `Ring`) with loading/skeleton/empty/error/success states. 3. Server data via `lib/supabase/server.ts`; mutations via Route Handlers. 4. AI only via `lib/gemini/client.ts` with compact prompts. 5. Extend with `0002_*.sql` + `types/database.ts`.
## Design + motion system (Phase 10)
- Tokens: `tailwind.config.ts` + `src/app/globals.css` (light/dark CSS vars, glass/gradient/mesh, safe-area, 100dvh, reduced-motion). Fonts: Inter (sans) + Sora (display) via `next/font`.
- Motion: `src/lib/motion/{tokens,hooks,components,celebrate}` — page transitions, Reveal whileInView once, stagger, AnimatedNumber, confetti; transform/opacity only; `linguaai_reduced_motion` + `linguaai_haptics` gates.
- Shell: `AppShell` (all authed routes) + `BottomTabBar` (Home/Learn/Words/Challenge/Profile) + `ThemeProvider` + `ToastProvider`. Public: scroll-story landing (`LandingStory`), `AuthShell`, `offline` page, `manifest.ts` PWA.
## i18n — trilingual interface (kk | ru | en)
- Dictionaries: `src/locales/{en,ru,kk}.json` (namespaces: `common nav language landing auth dashboard onboarding profile placement teacher modules errors learn smart progress`). English is the fallback; parity enforced by `src/lib/i18n/i18n.test.ts`.
- Client: `I18nProvider` (`src/lib/i18n/I18nProvider.tsx`) + `useTranslation()` → `t("dashboard.continueLearning")`. Never hardcode UI text; never render raw keys (missing keys humanize + `console.warn` in dev).
- Server: `getEffectiveLocale()` (profile → cookie → Accept-Language → en) + `getServerT(locale)` in Server Components.
- Selector: `LanguageSwitcher` (header, via `AppShell`) + `LanguageOptions` (onboarding step 0, profile Settings). Switch = instant context update + soft `router.refresh()`; no logout/reload.
- Persistence: `linguaai_locale` cookie (1y) + localStorage + `profiles.preferred_language` (`0011_i18n_preferred_language.sql`); `PATCH /api/profile/language`; sync on login in `auth/callback` + password login. Interface language ≠ English level (independent settings).
- AI: every teacher request sends `{ interfaceLanguage, learningLanguage: "en", level }`; system prompt pins explanations to the interface language while examples stay English. Offline fallbacks are localized per language.
- Formatting: `src/lib/i18n/format.ts` (`kk-KZ ru-RU en-US` dates/numbers/percent/XP/plurals via `Intl`). Layouts use `min-w-0/truncate/flex-wrap` — no fixed widths.
- Learning content (English words, passages, quiz prompts) intentionally stays English (§10); only UI chrome is localized.
