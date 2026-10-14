import { Header } from "@/components/layout/Header";
import { Card, CardDescription } from "@/components/ui/Card";
import { HealthStatus } from "@/components/health/HealthStatus";
import { getRequestLocale } from "@/lib/i18n/server";

const copy = {
  en: { title: "System status", desc: "Live connectivity check for core services.", checking: "Checking services…", healthy: "All systems operational", degraded: "Service degraded", updated: "Updated" },
  ru: { title: "Статус системы", desc: "Живая проверка доступности основных сервисов.", checking: "Проверяем сервисы…", healthy: "Все системы работают", degraded: "Есть неполадки", updated: "Обновлено" },
  kk: { title: "Жүйе мәртебесі", desc: "Негізгі қызметтердің қолжетімділігін тірі тексеру.", checking: "Қызметтер тексерілуде…", healthy: "Барлық жүйе жұмыс істейді", degraded: "Қызметте ақау бар", updated: "Жаңартылды" },
} as const;

export const metadata = { title: "System status" };

export default async function HealthPage() {
  const c = copy[await getRequestLocale()];
  return <div className="min-h-screen"><Header /><main className="mx-auto max-w-md px-4 py-12"><h1 className="font-display text-2xl font-bold">{c.title}</h1><Card className="mt-4"><CardDescription>{c.desc}</CardDescription><div className="mt-5"><HealthStatus labels={c} /></div></Card></main></div>;
}
