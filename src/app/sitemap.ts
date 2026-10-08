import type { MetadataRoute } from "next";

const FALLBACK = "https://lingua-ai-project.vercel.app";

function site(): string {
  const raw = (process.env.NEXT_PUBLIC_APP_URL ?? "").trim().replace(/\/+$/, "");
  if (/^https?:\/\//i.test(raw) && !raw.includes("localhost")) return raw;
  return FALLBACK;
}

/** Public routes that render without a session (verified: no signed-in redirect). */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = site();
  const pages: Array<{ path: string; priority: number; changeFrequency: "weekly" | "monthly" }> = [
    { path: "/", priority: 1, changeFrequency: "weekly" },
    { path: "/placement", priority: 0.8, changeFrequency: "monthly" },
    { path: "/signup", priority: 0.8, changeFrequency: "monthly" },
    { path: "/login", priority: 0.5, changeFrequency: "monthly" },
    { path: "/vocabulary", priority: 0.6, changeFrequency: "weekly" },
    { path: "/grammar", priority: 0.6, changeFrequency: "weekly" },
    { path: "/reading", priority: 0.6, changeFrequency: "weekly" },
    { path: "/listening", priority: 0.6, changeFrequency: "weekly" },
  ];
  return pages.map((p) => ({ url: `${base}${p.path}`, changeFrequency: p.changeFrequency, priority: p.priority }));
}
