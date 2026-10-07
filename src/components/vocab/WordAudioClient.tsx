"use client";
import { Button } from "@/components/ui/Button";
import { speak } from "@/lib/vocab/speak";
import { useTranslation } from "@/lib/i18n/I18nProvider";

export function WordAudioClient({ word }: { word: string }) {
  const { t } = useTranslation();
  return (
    <Button size="md" variant="secondary" onClick={() => speak(word)} aria-label={t("learn.pronounce", { word })}>
      🔊 {t("learn.listen")}
    </Button>
  );
}
