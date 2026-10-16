import { Spinner } from "@/components/ui/Button";
import { getRequestLocale, getServerT } from "@/lib/i18n/server";

export default async function Loading() {
  const t = getServerT(await getRequestLocale());
  return (
    <div
      role="status"
      className="mx-auto flex max-w-lg flex-col items-center gap-3 px-4 py-16 text-center"
      aria-busy="true"
      aria-label={t("common.loading")}
    >
      <Spinner size="lg" aria-hidden />
      <p className="text-sm text-ink-600">{t("common.loading")}</p>
    </div>
  );
}
