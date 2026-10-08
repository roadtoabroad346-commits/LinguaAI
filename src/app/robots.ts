import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = "https://lingua-ai-project.vercel.app";
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/placement", "/signup", "/login", "/vocabulary", "/grammar", "/reading", "/listening"],
        disallow: ["/api/", "/auth/", "/dashboard", "/profile", "/onboarding", "/daily-challenge", "/dictionary", "/flashcards", "/smart-path", "/progress", "/speaking", "/writing", "/spelling", "/ai-teacher", "/offline"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
