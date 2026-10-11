"use client";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Progress } from "@/components/ui/feedback";
import { useTranslation } from "@/lib/i18n/I18nProvider";

export interface Criterion {
  key: string;
  score: number;
  note: string;
}

const CRITERION_LABEL_KEYS: Record<string, string> = {
  task: "learn.critTask",
  coherence: "learn.critCoherence",
  vocabulary: "learn.critVocab",
  mechanics: "learn.critMechanics",
  fluency: "learn.critFluency",
  delivery: "learn.critDelivery",
};

/** Shared per-criterion score bars for Writing + Speaking results. */
export function CriteriaBars({ criteria }: { criteria: Criterion[] }) {
  const { t } = useTranslation();
  if (!criteria || criteria.length === 0) return null;
  return (
    <Card>
      <CardTitle>{t("learn.criteriaTitle")}</CardTitle>
      <CardDescription>{t("learn.criteriaDesc")}</CardDescription>
      <ul className="mt-3 space-y-3">
        {criteria.map((c) => (
          <li key={c.key}>
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="font-medium text-ink-700 dark:text-ink-200">{t(CRITERION_LABEL_KEYS[c.key] ?? "learn.critTask")}</span>
              <span className="shrink-0 font-bold text-ink-900 dark:text-ink-50">{c.score}/100</span>
            </div>
            <div className="mt-1"><Progress value={c.score} label={`${c.score}/100`} /></div>
            {c.note && <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">{c.note}</p>}
          </li>
        ))}
      </ul>
    </Card>
  );
}
