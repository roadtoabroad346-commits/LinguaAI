"use client";
import { Volume2 } from "lucide-react";
import { speak } from "@/lib/vocab/speak";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { haptic } from "@/lib/motion/hooks";

export function WordAudioClient({ word, big = false }: { word: string; big?: boolean }) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      onClick={() => {
        haptic(6);
        speak(word);
      }}
      aria-label={t("learn.pronounce", { word })}
      className={
        big
          ? "touch-44 inline-flex h-14 w-14 items-center justify-center rounded-full bg-brand-gradient text-white shadow-pop"
          : "touch-44 inline-flex h-11 items-center gap-2 rounded-2xl bg-brand-50 px-4 font-semibold text-brand-700 dark:bg-brand-950 dark:text-brand-200"
      }
    >
      <Volume2 className={big ? "h-6 w-6" : "h-4 w-4"} />
      {!big && (
        <span aria-hidden className="flex h-4 items-end gap-[2px]">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className="w-[3px] origin-bottom animate-waveform rounded-full bg-current" style={{ height: "100%", animationDelay: `${i * 0.15}s` }} />
          ))}
        </span>
      )}
      {!big && <span className="text-sm">{t("learn.listen")}</span>}
    </button>
  );
}
