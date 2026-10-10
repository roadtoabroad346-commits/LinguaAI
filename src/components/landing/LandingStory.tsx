"use client";

import * as React from "react";
import Link from "next/link";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import {
  Sparkles, Play, BookOpen, Layers, PenLine, BookText, Headphones,
  Flame, Trophy, ArrowRight, Check, X, ChevronDown, Zap, Target, Compass,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/feedback";
import { RingProgress } from "@/components/ui/Ring";
import { Reveal, Stagger, StaggerItem, AnimatedNumber } from "@/lib/motion/components";
import { celebrate } from "@/lib/motion/celebrate";
import { haptic } from "@/lib/motion/hooks";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { useAuth } from "@/components/auth/AuthProvider";
import { cn } from "@/lib/utils";

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

const DEMO_Q = { word: "resilient", options: ["fragile", "strong after hardship", "loud", "ancient"], answer: 1 };

function DemoQuiz() {
  const { t } = useTranslation();
  const [picked, setPicked] = React.useState<number | null>(null);
  const correct = picked === DEMO_Q.answer;
  return (
    <div className="rounded-3xl border border-ink-200/70 bg-white p-5 shadow-card dark:border-ink-700 dark:bg-ink-900">
      <div className="flex items-center gap-2">
        <Badge tone="brand">{t("landing.demoBadge")}</Badge>
        <span className="text-xs text-ink-500">{t("landing.demoHint")}</span>
      </div>
      <p className="font-display mt-3 text-2xl font-bold">“{DEMO_Q.word}”</p>
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
        {picked === null ? t("landing.demoIdle") : correct ? t("landing.demoGood") : t("landing.demoBad")}
      </p>
      {picked !== null && (
        <button onClick={() => setPicked(null)} className="mt-2 text-xs font-semibold text-brand-600 underline">
          {t("landing.demoRetry")}
        </button>
      )}
    </div>
  );
}

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

function Faq() {
  const { t } = useTranslation();
  const [open, setOpen] = React.useState<number | null>(0);
  const items = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({ q: t(`landing.fq${n}q`), a: t(`landing.fq${n}a`) }));
  return (
    <div className="mx-auto max-w-2xl space-y-2.5">
      {items.map((f, i) => {
        const isOpen = open === i;
        return (
          <div key={i} className="overflow-hidden rounded-2xl border border-ink-200/70 bg-white dark:border-ink-700 dark:bg-ink-900">
            <button
              onClick={() => { haptic(6); setOpen(isOpen ? null : i); }}
              aria-expanded={isOpen}
              className="touch-44 flex min-h-[56px] w-full items-center justify-between gap-3 px-4 text-left text-[15px] font-semibold"
            >
              <span>{f.q}</span>
              <motion.span animate={{ rotate: isOpen ? 180 : 0 }}>
                <ChevronDown className="h-4 w-4 shrink-0 text-ink-400" />
              </motion.span>
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.28 }}>
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

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-600 dark:text-brand-300">{children}</p>;
}

export function LandingStory() {
  const { t } = useTranslation();
  // Signed-in visitors must never hit auth pages (middleware would bounce
  // them straight back to /dashboard, which felt like a broken redirect).
  const { status } = useAuth();
  const authed = status === "authenticated";
  const heroRef = React.useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 90]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.9], [1, 0.25]);

  const features = [
    { icon: Target, title: t("landing.sh1t"), desc: t("landing.sh1d"), mock: t("landing.sh1m") },
    { icon: BookOpen, title: t("landing.sh2t"), desc: t("landing.sh2d"), mock: t("landing.sh2m") },
    { icon: PenLine, title: t("landing.sh3t"), desc: t("landing.sh3d"), mock: t("landing.sh3m") },
    { icon: BookText, title: t("landing.sh4t"), desc: t("landing.sh4d"), mock: t("landing.sh4m") },
    { icon: Headphones, title: t("landing.sh5t"), desc: t("landing.sh5d"), mock: t("landing.sh5m") },
    { icon: Flame, title: t("landing.sh6t"), desc: t("landing.sh6d"), mock: t("landing.sh6m") },
  ];
  const problems = [
    { icon: Compass, title: t("landing.prob1t"), desc: t("landing.prob1d") },
    { icon: Layers, title: t("landing.prob2t"), desc: t("landing.prob2d") },
    { icon: Trophy, title: t("landing.prob3t"), desc: t("landing.prob3d") },
  ];
  const steps = [
    { n: "01", title: t("landing.m1t"), time: t("landing.m1time"), desc: t("landing.m1d") },
    { n: "02", title: t("landing.m2t"), time: t("landing.m2time"), desc: t("landing.m2d") },
    { n: "03", title: t("landing.m3t"), time: t("landing.m3time"), desc: t("landing.m3d") },
    { n: "04", title: t("landing.m4t"), time: t("landing.m4time"), desc: t("landing.m4d") },
  ];
  const deep = [
    { tag: t("landing.dd1tag"), title: t("landing.dd1t"), desc: t("landing.dd1d"), bullets: [t("landing.dd1b1"), t("landing.dd1b2"), t("landing.dd1b3"), t("landing.dd1b4")], cta: t("landing.dd1cta"), href: "/placement", mock: t("landing.dd1mock"), stat: "A1–C1" },
    { tag: t("landing.dd2tag"), title: t("landing.dd2t"), desc: t("landing.dd2d"), bullets: [t("landing.dd2b1"), t("landing.dd2b2"), t("landing.dd2b3"), t("landing.dd2b4")], cta: t("landing.dd2cta"), href: "/vocabulary", mock: t("landing.dd2mock"), stat: "60" },
    { tag: t("landing.dd3tag"), title: t("landing.dd3t"), desc: t("landing.dd3d"), bullets: [t("landing.dd3b1"), t("landing.dd3b2"), t("landing.dd3b3"), t("landing.dd3b4")], cta: t("landing.dd3cta"), href: "/listening", mock: t("landing.dd3mock"), stat: "10" },
    { tag: t("landing.dd4tag"), title: t("landing.dd4t"), desc: t("landing.dd4d"), bullets: [t("landing.dd4b1"), t("landing.dd4b2"), t("landing.dd4b3"), t("landing.dd4b4")], cta: t("landing.dd4cta"), href: "/smart-path", mock: t("landing.dd4mock"), stat: "≤45′" },
  ];
  const levels = [
    { t: t("landing.curA1t"), d: t("landing.curA1d"), m: t("landing.curA1m") },
    { t: t("landing.curA2t"), d: t("landing.curA2d"), m: t("landing.curA2m") },
    { t: t("landing.curB1t"), d: t("landing.curB1d"), m: t("landing.curB1m") },
    { t: t("landing.curB2t"), d: t("landing.curB2d"), m: t("landing.curB2m") },
    { t: t("landing.curC1t"), d: t("landing.curC1d"), m: t("landing.curC1m") },
  ];
  const quotes = [1, 2, 3, 4, 5, 6].map((n) => ({ q: t(`landing.q${n}t`), n: t(`landing.q${n}n`) }));
  const stats = [
    { v: Number(t("landing.statsS1v")) || 20, l: t("landing.statsS1l") },
    { v: Number(t("landing.statsS2v")) || 5, l: t("landing.statsS2l") },
    { v: Number(t("landing.statsS3v")) || 8, l: t("landing.statsS3l") },
    { v: Number(t("landing.statsS4v")) || 5, l: t("landing.statsS4l") },
  ];

  return (
    <div ref={heroRef}>
      <ScrollProgress />

      <motion.section style={{ y: heroY, opacity: heroOpacity }} className="bg-mesh relative overflow-hidden">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 pb-14 pt-10 md:grid-cols-2 md:pt-16">
          <div>
            <Badge tone="brand">{t("landing.badge")}</Badge>
            <h1 className="font-display mt-4 text-balance text-4xl font-extrabold leading-[1.05] tracking-tight md:text-6xl">
              {t("landing.heroTitleA")} <span className="text-gradient">{t("landing.heroTitleB")}</span>
            </h1>
            <p className="mt-4 max-w-lg text-pretty text-lg leading-relaxed text-ink-500 dark:text-ink-400">{t("landing.subtitle")}</p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link href={authed ? "/dashboard" : "/signup"} className="flex-1 sm:flex-none">
                <Button size="xl" shine className="w-full sm:w-auto">{authed ? t("placement.goDashboard") : t("landing.getStarted")} <ArrowRight className="h-4 w-4" /></Button>
              </Link>
              <Link href={authed ? "/placement?retake=1" : "/placement"} className="flex-1 sm:flex-none">
                <Button size="xl" variant="secondary" className="w-full sm:w-auto"><Play className="h-4 w-4" /> {authed ? t("placement.retake") : t("landing.tryPlacement")}</Button>
              </Link>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-4 text-xs font-medium text-ink-500">
              <span className="flex items-center gap-1.5"><Zap className="h-3.5 w-3.5 text-amber-500" /> {t("landing.heroP1")}</span>
              <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-green-600" /> {t("landing.heroP2")}</span>
              <span className="flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-brand-500" /> {t("landing.heroP3")}</span>
            </div>
          </div>
          <Reveal delay={0.1}><DemoQuiz /></Reveal>
        </div>
        <div className="sticky bottom-20 z-20 px-4 pb-2 md:hidden">
          <Link href={authed ? "/dashboard" : "/signup"}>
            <Button size="lg" shine className="w-full shadow-pop">{authed ? t("placement.goDashboard") : t("landing.stickyCta")} <ArrowRight className="h-4 w-4" /></Button>
          </Link>
        </div>
      </motion.section>

      <section className="border-y border-ink-200/60 bg-white/70 dark:border-ink-800 dark:bg-ink-900/50">
        <Stagger className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-10 md:grid-cols-4">
          {stats.map((s, i) => (
            <StaggerItem key={i} className="text-center">
              <p className="font-display text-gradient text-4xl font-extrabold tabular-nums md:text-5xl"><AnimatedNumber value={s.v} /></p>
              <p className="mx-auto mt-2 max-w-[220px] text-sm leading-snug text-ink-500 dark:text-ink-400">{s.l}</p>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 md:py-20">
        <Reveal className="mx-auto max-w-2xl text-center">
          <Eyebrow>{t("landing.probEyebrow")}</Eyebrow>
          <h2 className="font-display mt-2 text-balance text-2xl font-bold md:text-4xl">{t("landing.probTitle")}</h2>
          <p className="mt-3 text-pretty text-ink-500 dark:text-ink-400">{t("landing.probDesc")}</p>
        </Reveal>
        <Stagger className="mt-8 grid gap-3 sm:grid-cols-3">
          {problems.map((c) => (
            <StaggerItem key={c.title}>
              <Card interactive className="h-full">
                <c.icon className="h-6 w-6 text-brand-600" />
                <p className="font-display mt-3 font-bold">{c.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-ink-500 dark:text-ink-400">{c.desc}</p>
              </Card>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      <section className="border-y border-ink-200/60 bg-white/60 py-14 dark:border-ink-800 dark:bg-ink-900/40 md:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <Reveal className="mx-auto max-w-2xl text-center">
            <Eyebrow>{t("landing.mEyebrow")}</Eyebrow>
            <h2 className="font-display mt-2 text-balance text-2xl font-bold md:text-4xl">{t("landing.mTitle")}</h2>
            <p className="mt-3 text-ink-500 dark:text-ink-400">{t("landing.mDesc")}</p>
          </Reveal>
          <Stagger className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s) => (
              <StaggerItem key={s.n}>
                <Card interactive className="h-full">
                  <div className="flex items-center justify-between">
                    <span className="font-display text-gradient text-3xl font-extrabold">{s.n}</span>
                    <Badge tone="brand">{s.time}</Badge>
                  </div>
                  <p className="font-display mt-3 font-bold">{s.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-ink-500 dark:text-ink-400">{s.desc}</p>
                </Card>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 md:py-20">
        <Reveal className="max-w-2xl">
          <Eyebrow>{t("landing.showEyebrow")}</Eyebrow>
          <h2 className="font-display mt-2 text-2xl font-bold md:text-4xl">{t("landing.showTitle")}</h2>
          <p className="mt-3 text-ink-500 dark:text-ink-400">{t("landing.showDesc")}</p>
        </Reveal>
        <Stagger className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <StaggerItem key={f.title}>
              <Card interactive className="h-full">
                <div className="flex items-center gap-2.5">
                  <span className="bg-brand-gradient flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-white shadow-pop">
                    <f.icon className="h-5 w-5" />
                  </span>
                  <p className="font-display font-bold">{f.title}</p>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-ink-500 dark:text-ink-400">{f.desc}</p>
                <div className="mt-4 rounded-2xl bg-ink-50 p-3 text-center font-display text-sm font-bold text-brand-700 dark:bg-ink-800 dark:text-brand-200">
                  {f.mock}
                </div>
              </Card>
            </StaggerItem>
          ))}
        </Stagger>
        <Reveal className="mt-8 grid gap-4 md:grid-cols-2">
          <PhoneMock label={t("landing.phoneFlashT")}>
            <div className="rounded-2xl bg-brand-50 p-4 text-center dark:bg-brand-950">
              <p className="text-xs text-ink-500">{t("landing.flashTap")}</p>
              <p className="font-display mt-1 text-xl font-bold">resilient</p>
              <p className="mt-1 text-xs text-ink-500">strong after hardship</p>
              <div className="mt-3 flex gap-2">
                <span className="flex-1 rounded-xl bg-red-100 py-2 text-xs font-bold text-red-700">{t("landing.flashReview")}</span>
                <span className="flex-1 rounded-xl bg-green-100 py-2 text-xs font-bold text-green-700">{t("landing.flashKnown")}</span>
              </div>
            </div>
          </PhoneMock>
          <PhoneMock label={t("landing.phoneChT")}>
            <div className="space-y-2">
              <div className="flex items-center justify-between rounded-2xl bg-amber-50 p-3 dark:bg-amber-950">
                <span className="flex items-center gap-1 text-sm font-bold"><Flame className="h-4 w-4 text-orange-500" /> 12 days</span>
                <span className="text-xs font-bold text-brand-700">+25 XP</span>
              </div>
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-2xl border border-ink-100 p-3 text-sm dark:border-ink-800">{t("landing.chQ", { n: i })}</div>
              ))}
            </div>
          </PhoneMock>
        </Reveal>
      </section>

      <section className="border-y border-ink-200/60 bg-white/60 py-14 dark:border-ink-800 dark:bg-ink-900/40 md:py-20">
        <div className="mx-auto max-w-6xl space-y-10 px-4 md:space-y-14">
          <Reveal className="mx-auto max-w-2xl text-center">
            <Eyebrow>{t("landing.ddEyebrow")}</Eyebrow>
            <h2 className="font-display mt-2 text-balance text-2xl font-bold md:text-4xl">{t("landing.ddTitle")}</h2>
          </Reveal>
          {deep.map((d, i) => (
            <div key={d.title} className={cn("grid items-center gap-6 md:grid-cols-2 md:gap-10", i % 2 === 1 && "md:[&>*:first-child]:order-2")}>
              <Reveal>
                <Badge tone="brand">{d.tag}</Badge>
                <h3 className="font-display mt-3 text-balance text-xl font-bold md:text-3xl">{d.title}</h3>
                <p className="mt-3 text-pretty leading-relaxed text-ink-500 dark:text-ink-400">{d.desc}</p>
                <ul className="mt-4 space-y-2">
                  {d.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2.5 text-sm font-medium">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300">
                        <Check className="h-3 w-3" />
                      </span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
                <Link href={d.href as never} className="mt-5 inline-block">
                  <Button shine>{d.cta} <ArrowRight className="h-4 w-4" /></Button>
                </Link>
              </Reveal>
              <Reveal delay={0.08}>
                <div className="bg-brand-gradient relative overflow-hidden rounded-[2rem] p-6 text-white shadow-pop md:p-8">
                  <div aria-hidden className="absolute inset-0 bg-[radial-gradient(400px_200px_at_20%_10%,rgb(255255255/0.22),transparent)]" />
                  <p className="relative text-xs font-bold uppercase tracking-[0.18em] text-white/70">{d.mock}</p>
                  <p className="font-display relative mt-2 text-5xl font-extrabold md:text-6xl">{d.stat}</p>
                  <div className="relative mt-5 space-y-2">
                    {[0, 1, 2].map((r) => (
                      <div key={r} className="h-9 rounded-xl bg-white/15 backdrop-blur" style={{ width: `${92 - r * 14}%` }} />
                    ))}
                  </div>
                </div>
              </Reveal>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 md:py-20">
        <Reveal className="mx-auto max-w-2xl text-center">
          <Eyebrow>{t("landing.curEyebrow")}</Eyebrow>
          <h2 className="font-display mt-2 text-2xl font-bold md:text-4xl">{t("landing.curTitle")}</h2>
          <p className="mt-3 text-ink-500 dark:text-ink-400">{t("landing.curDesc")}</p>
        </Reveal>
        <Reveal className="mt-8 overflow-x-auto rounded-3xl border border-ink-200/70 shadow-card dark:border-ink-700">
          <table className="w-full min-w-[640px] border-collapse bg-white text-left text-sm dark:bg-ink-900">
            <thead>
              <tr className="border-b border-ink-200 dark:border-ink-700">
                <th className="px-5 py-3.5 font-bold">{t("landing.curH1")}</th>
                <th className="px-5 py-3.5 font-bold">{t("landing.curH2")}</th>
                <th className="px-5 py-3.5 font-bold">{t("landing.curH3")}</th>
              </tr>
            </thead>
            <tbody>
              {levels.map((r) => (
                <tr key={r.t} className="border-b border-ink-100 last:border-0 dark:border-ink-800">
                  <td className="whitespace-nowrap px-5 py-3.5"><Badge tone="brand">{r.t}</Badge></td>
                  <td className="px-5 py-3.5 text-ink-600 dark:text-ink-300">{r.d}</td>
                  <td className="px-5 py-3.5 font-semibold">{r.m}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Reveal>
      </section>

      <section className="border-y border-ink-200/60 bg-ink-950 py-14 text-white md:py-20">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 md:grid-cols-2">
          <Reveal>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-300">{t("landing.gamEyebrow")}</p>
            <h2 className="font-display mt-2 text-2xl font-bold md:text-4xl">{t("landing.gamTitle")}</h2>
            <p className="mt-3 text-ink-300">{t("landing.gamDesc")}</p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link href={authed ? "/dashboard" : "/signup"}><Button variant="warm" size="lg" shine className="w-full sm:w-auto">{authed ? t("placement.goDashboard") : t("landing.gamCta1")}</Button></Link>
              <Link href="/placement"><Button variant="secondary" size="lg" className="w-full border-white/20 bg-white/10 text-white hover:bg-white/20 sm:w-auto">{t("landing.gamCta2")}</Button></Link>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-3xl bg-white/10 p-5 text-center backdrop-blur">
                <RingProgress value={68} label={<AnimatedNumber value={68} className="text-white" />} sublabel="" tone="warm" />
                <p className="mt-2 text-sm font-bold">68 / 100 XP</p>
                <p className="text-xs text-ink-300">{t("landing.gamGoal")}</p>
              </div>
              <div className="rounded-3xl bg-white/10 p-5 text-center backdrop-blur">
                <Flame className="mx-auto h-10 w-10 animate-pulse-soft text-orange-400" />
                <p className="font-display mt-2 text-2xl font-extrabold"><AnimatedNumber value={12} /> days</p>
                <p className="text-xs text-ink-300">{t("landing.gamStreak")}</p>
              </div>
              {[t("landing.gamB1"), t("landing.gamB2"), t("landing.gamB3"), t("landing.gamB4")].map((b) => (
                <div key={b} className="flex items-center gap-2 rounded-2xl bg-white/10 px-3 py-2.5 text-sm font-semibold backdrop-blur">
                  <Trophy className="h-4 w-4 shrink-0 text-amber-300" /> {b}
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 md:py-20">
        <Reveal className="mx-auto max-w-2xl text-center">
          <Eyebrow>{t("landing.cmpEyebrow")}</Eyebrow>
          <h2 className="font-display mt-2 text-2xl font-bold md:text-4xl">{t("landing.cmpTitle")}</h2>
          <p className="mt-3 text-ink-500 dark:text-ink-400">{t("landing.cmpDesc")}</p>
        </Reveal>
        <Stagger className="mt-8 grid gap-3 md:grid-cols-3">
          <StaggerItem>
            <Card className="h-full">
              <p className="font-display font-bold">{t("landing.cmp1t")}</p>
              <ul className="mt-3 space-y-2.5">
                {[t("landing.cmp1d1"), t("landing.cmp1d2"), t("landing.cmp1d3")].map((d) => (
                  <li key={d} className="flex items-start gap-2 text-sm text-ink-500 dark:text-ink-400">
                    <X className="mt-0.5 h-4 w-4 shrink-0 text-red-400" /> {d}
                  </li>
                ))}
              </ul>
            </Card>
          </StaggerItem>
          <StaggerItem>
            <Card className="h-full">
              <p className="font-display font-bold">{t("landing.cmp2t")}</p>
              <ul className="mt-3 space-y-2.5">
                {[t("landing.cmp2d1"), t("landing.cmp2d2"), t("landing.cmp2d3")].map((d) => (
                  <li key={d} className="flex items-start gap-2 text-sm text-ink-500 dark:text-ink-400">
                    <X className="mt-0.5 h-4 w-4 shrink-0 text-red-400" /> {d}
                  </li>
                ))}
              </ul>
            </Card>
          </StaggerItem>
          <StaggerItem>
            <Card interactive className="relative h-full border-2 border-brand-500 shadow-pop dark:border-brand-400">
              <Badge tone="brand" className="absolute -top-3 left-4">LinguaAI</Badge>
              <p className="font-display mt-1 font-bold">{t("landing.cmp3t")}</p>
              <ul className="mt-3 space-y-2.5">
                {[t("landing.cmp3d1"), t("landing.cmp3d2"), t("landing.cmp3d3")].map((d) => (
                  <li key={d} className="flex items-start gap-2 text-sm font-semibold">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600" /> {d}
                  </li>
                ))}
              </ul>
            </Card>
          </StaggerItem>
        </Stagger>
      </section>

      <section className="border-t border-ink-200/60 bg-white/60 py-14 dark:border-ink-800 dark:bg-ink-900/40 md:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <Reveal className="mx-auto max-w-2xl text-center">
            <Eyebrow>{t("landing.proofEyebrow")}</Eyebrow>
            <h2 className="font-display mt-2 text-2xl font-bold md:text-4xl">{t("landing.proofTitle")}</h2>
          </Reveal>
          <Stagger className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {quotes.map((s) => (
              <StaggerItem key={s.n}>
                <Card interactive className="h-full">
                  <div className="flex gap-1 text-amber-500" aria-label="5 out of 5 stars">{"★★★★★"}</div>
                  <p className="mt-2 text-sm leading-relaxed">“{s.q}”</p>
                  <p className="mt-3 text-xs font-bold text-ink-500">{s.n}</p>
                </Card>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 md:py-20">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-2xl font-bold md:text-4xl">{t("landing.faqTitle")}</h2>
        </Reveal>
        <div className="mt-8"><Faq /></div>
      </section>

      <section className="px-4 pb-16">
        <Reveal className="bg-brand-gradient relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] px-6 py-14 text-center text-white shadow-pop md:py-20">
          <div aria-hidden className="absolute inset-0 bg-[radial-gradient(500px_240px_at_20%_10%,rgb(255255255/0.25),transparent),radial-gradient(500px_260px_at_85%_90%,rgb(24515811/0.4),transparent)]" />
          <Sparkles className="relative mx-auto h-8 w-8 text-amber-200" />
          <h2 className="font-display relative mx-auto mt-3 max-w-xl text-balance text-3xl font-extrabold md:text-5xl">{t("landing.finTitle")}</h2>
          <p className="relative mx-auto mt-3 max-w-md text-white/85">{t("landing.finDesc")}</p>
          <div className="relative mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href={authed ? "/dashboard" : "/signup"}><Button variant="secondary" size="xl" shine className="w-full sm:w-auto">{authed ? t("placement.goDashboard") : t("landing.getStarted")} <ArrowRight className="h-4 w-4" /></Button></Link>
            <Link href={authed ? "/auth/signout" : "/login"}><Button size="xl" variant="ghost" className="w-full text-white hover:bg-white/15 sm:w-auto">{authed ? t("auth.signout") : t("landing.login")}</Button></Link>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
