import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LinguaAI — Learn English A1–C1",
    short_name: "LinguaAI",
    description: "Personalized AI-powered English learning for A1–C1 students.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#0f172a",
    theme_color: "#4f46e5",
    orientation: "portrait",
    icons: [{ src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
