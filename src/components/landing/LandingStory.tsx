"use client";

import * as React from "react";
import Link from "next/link";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Play,
  BookOpen,
  Layers,
  PenLine,
  BookText,
  Headphones,
  Flame,
  Trophy,
  ArrowRight,
  Check,
  ChevronDown,
  Zap,
  Target,
  Compass,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/feedback";
import { RingProgress } from "@/components/ui/Ring";
import { Reveal, Stagger, StaggerItem, AnimatedNumber } from "@/lib/motion/components";
import { celebrate } from "@/lib/motion/celebrate";
import { haptic } from "@/lib/motion/hooks";
import { cn } from "@/lib/utils";

/* ---------- scroll progress ---------- */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useTransform(scrollYProgress, [0, 1], [0, 1]);
  return (
    <motion.div
      aria-hidden
      style={{ scaleX }}
      className="fixed inset-x-0 top-0 z-50 h-1 origin-left bg-gradient-to-r from-brand-600 via-violet-500 to-amber-500"
    />
  );
}

/* ---------- mini interactive demo ---------- */
const DEMO_Q = { word: "resilient", options: ["fragile", "strong after hardship", "loud", "ancient"], answer: 1 };

function DemoQuiz() {
  const [picked, setPicked] = React.useState<number | null>(null);
  const correct = picked === DEMO_Q.answer;
  return (
    <div className="rounded-3xl border border-ink-200/70 bg-white p-5 shadow-card dark:border-ink-700 dark:bg-ink-900">
      <div className="flex items-center gap-2">
        <Badge tone="brand">Live demo</Badge>
        <span className="text-xs text-ink-500">Tap the right meaning</span>
      </div>
      <p className="font-display mt-3 text-2xl font-bold">
        “{DEMO_Q.word}”
      </p>
      <div className="mt-3 grid gap-2">
        {DEMO_Q.options.map((opt, i) => {
          const isRight = picked !== null && i === DEMO_Q.answer;
          const isWrong = picked === i && i !== DEMO_Q.answer;
          return (
            <motion.button
              key={opt}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                if (picked !== null) return;
                setPicked(i);
                haptic(i === DEMO_Q.answer ? [10, 30, 10] : 20);
                if (i === DEMO_Q.answer) celebrate();
              }}
              className={cn(
                "touch-44 flex min-h-[48px] items-center justify-between rounded-2xl border px-4 text-left text-sm font-medium transition-colors",
                isRight
                  ? "border-green-500 bg-green-50 text-green-900 dark:bg-green-950 dark:text-green-100"
                  : isWrong
                    ? "animate-shake border-red-400 bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-100"
                    : "border-ink-200 bg-ink-50 hover:border-brand-300 dark:border-ink-700 dark:bg-ink-800"
              )}
            >
              <span>{opt}</span>
              {isRight && <Check className="h-4 w-4 text-green-600" />}
            </motion.button>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-ink-500" aria-live="polite">
        {picked === null ? "This is how quizzes feel — instant feedback, zero friction." : correct ? "+5 XP · Nice! Placement, vocab and streaks all work like this." : "Not quite — the right answer pulses green. Try again ↓"}
      </p>
      {picked !== null && (
        <button onClick={() => setPicked(null)} className="mt-2 text-xs font-semibold text-brand-600 underline">
          Retry demo
        </button>
      )}
    </div>
  );
}

/* ---------- device mockup ---------- */
function PhoneMock({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="mx-auto w-full max-w-[300px]">
      <div className="rounded-[2.2rem] border border-ink-200 bg-ink-900 p-2 shadow-pop dark:border-ink-700">
        <div className="overflow-hidden rounded-[1.7rem] bg-white dark:bg-ink-950">
          <div className="flex items-center justify-center gap-1.5 border-b border-ink-100 py-2 dark:border-ink-800">
            <span className="h-1.5 w-1.5 rounded-full bg-ink-200" />
            <span className="h-1.5 w-16 rounded-full bg-ink-200" />
          </div>
          <div className="min-h-[320px] p-3">{children}</div>
        </div>
      </div>
      <p className="mt-2 text-center text-xs font-semibold text-ink-500">{label}</p>
    </div>
  );
}

/* ---------- FAQ ---------- */
const FAQS = [
  { q: "How long until I feel progress?", a: "Most learners finish placement in ~6 minutes, then get a Smart Path for today. Daily Challenge takes 5 minutes — streaks and XP make it stick." },
  { q: "Is it good for beginners (A1)?", a: "Yes. Placement finds your level, then content steps down when accuracy drops below 40%. Tap any word for a definition in a bottom sheet." },
  { q: "Do I need to pay or install anything?", a: "No. It runs in the browser, installs as a PWA, and works offline for visited pages. Sign in only to save progress across devices." },
  { q: "How does the AI Teacher work?", a: "Open-ended chat with compact prompts — explanations in your interface language (EN/RU/KK), examples stay in English. Deterministic quizzes never need AI." },
];

function Faq() {
  const [open, setOpen] = React.useState<number | null>(0);
  return (
    <div className="mx-auto max-w-2xl space-y-2.5">
      {FAQS.map((f, i) => {
        const isOpen = open === i;
        return (
          <div key={f.q} className="overflow-hidden rounded-2xl border border-ink-200/70 bg-white dark:border-ink-700 dark:bg-ink-900">
            <button
              onClick={() => {
                haptic(6);
                setOpen(isOpen ? null : i);
              }}
              aria-expanded={isOpen}
              className="touch-44 flex min-h-[56px] w-full items-center justify-between gap-3 px-4 text-left text-[15px] font-semibold"
            >
              <span>{f.q}</span>
              <motion.span animate={{ rotate: isOpen ? 180 : 0 }}>
                <ChevronDown className="h-4 w-4 text-ink-400" />
              </motion.span>
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.28 }}
                >
                  <p className="px-4 pb-4 text-sm leading-relaxed text-ink-500 dark:text-ink-400">{f.a}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- main landing ---------- */
export function LandingStory({ t }: { t: Record<string, string> }) {
  const heroRef = React.useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 90]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.9], [1, 0.25]);

  const features = [
    { icon: Target, title: "Placement test", desc: "20 questions · one per screen · level reveal with celebration.", mock: "A1 → C1" },
    { icon: BookOpen, title: "Vocabulary + flashcards", desc: "60-word bank · 3D flip · swipe right = known.", mock: "resilient" },
    { icon: PenLine, title: "Grammar", desc: "15 topics · lesson + 5-question quiz · instant grading.", mock: "Articles" },
    { icon: BookText, title: "Reading", desc: "10 passages · tap-to-peek definitions · comprehension.", mock: "Morning routine" },
    { icon: Headphones, title: "Listening + dictation", desc: "10 tracks · per-line play · forgiving typing.", mock: "Podcast" },
    { icon: Flame, title: "Daily challenge + XP", desc: "5 questions/day · streak flame · XP ring vs goal.", mock: "+25 XP" },
  ];

  return (
    <div ref={heroRef}>
      <ScrollProgress />

      {/* HERO — full viewport */}
      <motion.section style={{ y: heroY, opacity: heroOpacity }} className="bg-mesh relative overflow-hidden">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 pb-14 pt-10 md:grid-cols-2 md:pt-16">
          <div>
            <Badge tone="brand">{t.badge}</Badge>
            <h1 className="font-display mt-4 text-balance text-4xl font-extrabold leading-[1.05] tracking-tight md:text-6xl">
              English that <span className="text-gradient">adapts to you.</span>
            </h1>
            <p className="mt-4 max-w-lg text-pretty text-lg leading-relaxed text-ink-500 dark:text-ink-400">{t.subtitle}</p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link href="/signup" className="flex-1 sm:flex-none">
                <Button size="xl" shine className="w-full sm:w-auto">
                  {t.getStarted} <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/placement" className="flex-1 sm:flex-none">
                <Button size="xl" variant="secondary" className="w-full sm:w-auto">
                  <Play className="h-4 w-4" /> {t.tryPlacement}
                </Button>
              </Link>
            </div>
            <div className="mt-5 flex items-center gap-4 text-xs font-medium text-ink-500">
              <span className="flex items-center gap-1.5"><Zap className="h-3.5 w-3.5 text-amber-500" /> 5 min/day</span>
              <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-green-600" /> A1–C1</span>
              <span className="flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-brand-500" /> AI + deterministic</span>
            </div>
          </div>
          <Reveal delay={0.1}>
            <DemoQuiz />
          </Reveal>
        </div>
        {/* thumb-reachable sticky CTA on phones */}
        <div className="sticky bottom-20 z-20 px-4 pb-2 md:hidden">
          <Link href="/signup">
            <Button size="lg" shine className="w-full shadow-pop">
              Start free — 6-min placement <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </motion.section>

      {/* PROBLEM → PROMISE */}
      <section className="mx-auto max-w-6xl px-4 py-14 md:py-20">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-600">Problem → promise</p>
          <h2 className="font-display mt-2 text-2xl font-bold md:text-4xl">Apps teach lessons. LinguaAI builds a loop.</h2>
          <p className="mt-3 text-ink-500">Assess → Personalize → Learn → Practice → Feedback → Review → Improve. Your mistakes resurface as tomorrow&apos;s plan.</p>
        </Reveal>
        <Stagger className="mt-8 grid gap-3 sm:grid-cols-3">
          {[
            { icon: Compass, title: "Assess in minutes", desc: "Placement + Smart Path read your level, weak skills and due words." },
            { icon: Layers, title: "Practice everywhere", desc: "Vocab links into reading, listening, spelling and writing." },
            { icon: Trophy, title: "Stay in the loop", desc: "XP, streaks and badges reward the return — not the binge." },
          ].map((c) => (
            <StaggerItem key={c.title}>
              <Card interactive>
                <c.icon className="h-6 w-6 text-brand-600" />
                <p className="font-display mt-3 font-bold">{c.title}</p>
                <p className="mt-1 text-sm text-ink-500">{c.desc}</p>
              </Card>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      {/* SHOWCASE */}
      <section className="border-y border-ink-200/60 bg-white/60 py-14 dark:border-ink-800 dark:bg-ink-900/40 md:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <Reveal className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-600">Real product tour</p>
            <h2 className="font-display mt-2 text-2xl font-bold md:text-4xl">Everything you need, thumb-first.</h2>
            <p className="mt-3 text-ink-500">One question per screen. Big answer cards. Sticky bottom actions. Bottom sheets, never tiny modals.</p>
          </Reveal>
          <Stagger className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <StaggerItem key={f.title}>
                <Card interactive className="h-full">
                  <div className="flex items-center gap-2.5">
                    <span className="bg-brand-gradient flex h-10 w-10 items-center justify-center rounded-2xl text-white shadow-pop">
                      <f.icon className="h-5 w-5" />
                    </span>
                    <p className="font-display font-bold">{f.title}</p>
                  </div>
                  <p className="mt-2 text-sm text-ink-500">{f.desc}</p>
                  <div className="mt-4 rounded-2xl bg-ink-50 p-3 text-center font-display text-sm font-bold text-brand-700 dark:bg-ink-800 dark:text-brand-200">
                    {f.mock}
                  </div>
                </Card>
              </StaggerItem>
            ))}
          </Stagger>
          <Reveal className="mt-8 grid gap-4 md:grid-cols-2">
            <PhoneMock label="Flashcards — swipe right = known">
              <div className="rounded-2xl bg-brand-50 p-4 text-center dark:bg-brand-950">
                <p className="text-xs text-ink-500">Tap to flip</p>
                <p className="font-display mt-1 text-xl font-bold">resilient</p>
                <p className="mt-1 text-xs text-ink-500">strong after hardship</p>
                <div className="mt-3 flex gap-2">
                  <span className="flex-1 rounded-xl bg-red-100 py-2 text-xs font-bold text-red-700">Review</span>
                  <span className="flex-1 rounded-xl bg-green-100 py-2 text-xs font-bold text-green-700">Known</span>
                </div>
              </div>
            </PhoneMock>
            <PhoneMock label="Daily challenge — 5/day with streak">
              <div className="space-y-2">
                <div className="flex items-center justify-between rounded-2xl bg-amber-50 p-3 dark:bg-amber-950">
                  <span className="flex items-center gap-1 text-sm font-bold"><Flame className="h-4 w-4 text-orange-500" /> 12 days</span>
                  <span className="text-xs font-bold text-brand-700">+25 XP</span>
                </div>
                {[1, 2, 3].map((i) => (
                  <div key={i} className="rounded-2xl border border-ink-100 p-3 text-sm dark:border-ink-800">Question {i} · instant feedback</div>
                ))}
              </div>
            </PhoneMock>
          </Reveal>
        </div>
      </section>

      {/* A1 → C1 PATH */}
      <section className="mx-auto max-w-6xl px-4 py-14 md:py-20">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-600">How it works</p>
          <h2 className="font-display mt-2 text-2xl font-bold md:text-4xl">From A1 to C1 on one path.</h2>
        </Reveal>
        <div className="relative mx-auto mt-10 max-w-2xl">
          <div aria-hidden className="absolute bottom-6 left-[27px] top-2 w-0.5 bg-gradient-to-b from-brand-500 via-violet-400 to-amber-400 md:left-[31px]" />
          <div className="space-y-4">
            {[
              { lvl: "A1–A2", title: "Foundations", desc: "Placement → core words → simple grammar → guided reading.", xp: "0–500 XP" },
              { lvl: "B1", title: "Momentum", desc: "Daily challenge streak · flashcards SRS · dictation.", xp: "500–1500 XP" },
              { lvl: "B2", title: "Fluency", desc: "Podcasts · essays with AI check · speaking read-aloud.", xp: "1500–3000 XP" },
              { lvl: "C1", title: "Mastery", desc: "Smart Path targets weak skills · recurring mistakes fixed.", xp: "3000+ XP" },
            ].map((s, i) => (
              <Reveal key={s.lvl} delay={i * 0.05}>
                <div className="relative flex gap-4 rounded-3xl border border-ink-200/70 bg-white p-4 shadow-card dark:border-ink-700 dark:bg-ink-900">
                  <span className="bg-brand-gradient z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-xs font-extrabold text-white md:h-14 md:w-14">
                    {s.lvl.split("–")[0]}
                  </span>
                  <div className="min-w-0">
                    <p className="font-display font-bold">{s.title} <span className="ml-1 text-xs font-semibold text-ink-400">{s.xp}</span></p>
                    <p className="mt-0.5 text-sm text-ink-500">{s.desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* GAMIFICATION */}
      <section className="border-y border-ink-200/60 bg-ink-950 py-14 text-white md:py-20">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 md:grid-cols-2">
          <Reveal>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-300">Gamification</p>
            <h2 className="font-display mt-2 text-2xl font-bold md:text-4xl">Small wins, every day.</h2>
            <p className="mt-3 text-ink-300">Animated XP ring vs daily goal. Streak flame that begs to stay lit. Badges for first steps, perfect days and warm-ups.</p>
            <div className="mt-6 flex gap-3">
              <Link href="/signup"><Button variant="warm" size="lg" shine>Get started free</Button></Link>
              <Link href="/placement"><Button variant="secondary" size="lg" className="border-white/20 bg-white/10 text-white hover:bg-white/20">Placement</Button></Link>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-3xl bg-white/10 p-5 text-center backdrop-blur">
                <RingProgress value={68} label={<AnimatedNumber value={68} className="text-white" />} sublabel="" tone="warm" />
                <p className="mt-2 text-sm font-bold">68 / 100 XP</p>
                <p className="text-xs text-ink-300">today&apos;s goal</p>
              </div>
              <div className="rounded-3xl bg-white/10 p-5 text-center backdrop-blur">
                <Flame className="mx-auto h-10 w-10 animate-pulse-soft text-orange-400" />
                <p className="font-display mt-2 text-2xl font-extrabold"><AnimatedNumber value={12} /> days</p>
                <p className="text-xs text-ink-300">current streak</p>
              </div>
              {["First steps", "Perfect day", "Warm-up", "Bookworm"].map((b) => (
                <div key={b} className="flex items-center gap-2 rounded-2xl bg-white/10 px-3 py-2.5 text-sm font-semibold backdrop-blur">
                  <Trophy className="h-4 w-4 text-amber-300" /> {b}
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* SOCIAL PROOF */}
      <section className="mx-auto max-w-6xl px-4 py-14 md:py-20">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-600">Loved by learners</p>
          <h2 className="font-display mt-2 text-2xl font-bold md:text-4xl">Five minutes a day actually sticks.</h2>
        </Reveal>
        <Stagger className="mt-8 grid gap-3 md:grid-cols-3">
          {[
            { n: "Aigerim · B1", q: "The bottom-tab app feels native. I do the challenge on the bus — streak 34 days." },
            { n: "Dmitry · A2 → B1", q: "Placement nailed my level. Smart Path stopped repeating what I already knew." },
            { n: "Aruzhan · B2", q: "Tap-to-peek words in reading + dictation grading = my favorite loop. XP ring keeps me honest." },
          ].map((s) => (
            <StaggerItem key={s.n}>
              <Card interactive className="h-full">
                <div className="flex gap-1 text-amber-500" aria-label="5 out of 5 stars">{"★★★★★"}</div>
                <p className="mt-2 text-sm leading-relaxed">“{s.q}”</p>
                <p className="mt-3 text-xs font-bold text-ink-500">{s.n}</p>
              </Card>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-6xl px-4 pb-14 md:pb-20">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-2xl font-bold md:text-4xl">Questions, answered.</h2>
        </Reveal>
        <div className="mt-8"><Faq /></div>
      </section>

      {/* FINAL CTA */}
      <section className="px-4 pb-16">
        <Reveal className="bg-brand-gradient relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] px-6 py-14 text-center text-white shadow-pop md:py-20">
          <div aria-hidden className="absolute inset-0 bg-[radial-gradient(500px_240px_at_20%_10%,rgb(255255255/0.25),transparent),radial-gradient(500px_260px_at_85%_90%,rgb(24515811/0.4),transparent)]" />
          <Sparkles className="relative mx-auto h-8 w-8 text-amber-200" />
          <h2 className="font-display relative mx-auto mt-3 max-w-xl text-balance text-3xl font-extrabold md:text-5xl">Find your level in 6 minutes.</h2>
          <p className="relative mx-auto mt-3 max-w-md text-white/85">Join LinguaAI, take placement, get today&apos;s Smart Path. Free to start.</p>
          <div className="relative mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/signup"><Button variant="secondary" size="xl" shine className="w-full sm:w-auto">Get started free <ArrowRight className="h-4 w-4" /></Button></Link>
            <Link href="/login"><Button size="xl" variant="ghost" className="w-full text-white hover:bg-white/15 sm:w-auto">Log in</Button></Link>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
