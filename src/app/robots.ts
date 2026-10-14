import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const configured = (process.env.NEXT_PUBLIC_APP_URL ?? "").trim().replace(/\/+$/, "");
  const base = /^https?:\/\//i.test(configured) && !configured.includes("localhost") ? configured : "https://lingua-ai-project.vercel.app";
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/placement", "/signup", "/login", "/vocabulary", "/grammar", "/reading", "/listening", "/pronunciation", "/privacy", "/terms", "/health"],
        disallow: ["/api/", "/auth/", "/dashboard", "/profile", "/onboarding", "/daily-challenge", "/dictionary", "/flashcards", "/smart-path", "/progress", "/speaking", "/writing", "/spelling", "/ai-teacher", "/offline"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
