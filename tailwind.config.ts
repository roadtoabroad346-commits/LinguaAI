import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./src/**/*.{ts,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef4ff", 100: "#dbe6fe", 200: "#bfd3fe", 300: "#93b4fd",
          400: "#60a5fa", 500: "#3b82f6", 600: "#2563eb", 700: "#1d4ed8",
          800: "#1e40af", 900: "#1e3a8a", 950: "#172554"
        },
        ink: {
          50: "#f8fafc", 100: "#f1f5f9", 200: "#e2e8f0", 300: "#cbd5e1",
          400: "#94a3b8", 500: "#64748b", 600: "#475569", 700: "#334155",
          800: "#1e293b", 900: "#0f172a"
        }
      },
      boxShadow: {
        card: "0 1px 2px rgb(15 23 42 / 0.06), 0 8px 24px -12px rgb(15 23 42 / 0.18)",
        pop: "0 12px 40px -12px rgb(37 99 235 / 0.35)"
      }
    }
  },
  plugins: []
};
export default config;
