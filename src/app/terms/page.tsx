import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { getRequestLocale } from "@/lib/i18n/server";

const copy = {
  en: ["Terms of Use", "LinguaAI is an educational tool, not an official exam or certification service.", "Use the service lawfully. Do not disrupt it, access another learner's data, automate abuse, or bypass security controls.", "Placement levels, AI feedback and recommendations are estimates. Verify important decisions with a qualified teacher or official test provider.", "You remain responsible for submitted content. Do not submit confidential, unlawful or third-party personal information.", "The service may change or be temporarily unavailable. Accounts used for abuse may be restricted. Terms may change with the product or legal requirements."],
  ru: ["Условия использования", "LinguaAI — учебный инструмент, а не официальный экзамен или сервис сертификации.", "Используйте сервис законно. Не нарушайте его работу, не пытайтесь получить чужие данные, автоматизировать злоупотребления или обходить защиту.", "Уровни теста, ответы ИИ и рекомендации являются оценочными. Важные решения проверяйте с преподавателем или официальным экзаменационным центром.", "Вы отвечаете за отправляемый контент. Не передавайте конфиденциальную, незаконную информацию или персональные данные третьих лиц.", "Сервис может меняться или временно быть недоступным. Аккаунты для злоупотреблений могут быть ограничены. Условия обновляются при изменении продукта или закона."],
  kk: ["Пайдалану шарттары", "LinguaAI — оқу құралы, ресми емтихан немесе сертификаттау қызметі емес.", "Қызметті заңды қолданыңыз. Жұмысын бұзбаңыз, басқа оқушының деректеріне кірмеңіз, теріс пайдалануды автоматтандырмаңыз және қауіпсіздікті айналып өтпеңіз.", "Тест деңгейі, ЖИ кері байланысы мен ұсыныстар — бағалау. Маңызды шешімдерді мұғаліммен немесе ресми емтихан орталығымен тексеріңіз.", "Жіберген мазмұнға өзіңіз жауаптысыз. Құпия, заңсыз немесе үшінші тұлғалардың жеке деректерін жібермеңіз.", "Қызмет өзгеруі немесе уақытша қолжетімсіз болуы мүмкін. Теріс пайдаланылған тіркелгілер шектелуі мүмкін. Өнім не заң өзгерсе, шарттар жаңартылады."],
} as const;

export const metadata = { title: "Terms of Use" };

export default async function TermsPage() {
  const [title, intro, ...paragraphs] = copy[await getRequestLocale()];
  return <div className="min-h-dvh"><Header /><main className="mx-auto max-w-3xl px-4 py-10"><h1 className="font-display text-3xl font-bold">{title}</h1><p className="mt-2 text-sm text-ink-500">14 October 2026</p><p className="mt-6 text-lg leading-7">{intro}</p><div className="mt-7 space-y-5 text-ink-700 dark:text-ink-300">{paragraphs.map((body) => <p key={body} className="leading-7">{body}</p>)}</div><Link href="/" className="mt-10 inline-block text-sm font-semibold text-brand-700 hover:underline">← LinguaAI</Link></main></div>;
}
