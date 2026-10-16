/** Lighthouse pass for key routes (mobile).
 * Usage:
 *   npm run build && npm run start -- --port 3100 &
 *   BASE_URL=http://localhost:3100 npm run lighthouse
 * Fails below thresholds so perf regressions block deploy.
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs";
import path from "node:path";

const run = promisify(execFile);
const base = (process.env.BASE_URL ?? "http://localhost:3100").replace(/\/$/, "");
const routeList = (process.env.LIGHTHOUSE_ROUTES ?? "/,/placement,/practice,/dashboard")
  .split(",")
  .map((route) => route.trim())
  .filter(Boolean);
const urls = routeList.map((route) => `${base}${route.startsWith("/") ? route : `/${route}`}`);
// A realistic regression gate for interactive app screens. The product target
// remains 90+ and every run reports Core Web Vital lab metrics explicitly.
const thresholds = {
  performance: Number(process.env.LIGHTHOUSE_PERF_MIN ?? 80),
  accessibility: 95,
  "best-practices": 95,
  seo: 90,
};
const NPX = process.platform === "win32" ? "npx.cmd" : "npx";

// Prefer Playwright's bundled Chromium headless shell when system Chrome
// is absent (CI/Windows): lighthouse accepts --chrome-path.
function findChrome() {
  if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) return process.env.CHROME_PATH;
  const roots = [
    path.join(process.env.LOCALAPPDATA ?? "", "ms-playwright"),
    path.join(process.env.HOME ?? "", ".cache", "ms-playwright"),
  ];
  try {
    for (const root of roots) {
      if (!fs.existsSync(root)) continue;
      for (const d of fs.readdirSync(root).sort().reverse()) {
        if (!d.startsWith("chromium")) continue;
        const found = searchChrome(path.join(root, d));
        if (found) return found;
      }
    }
  } catch {
    /* ignore */
  }
  return null;
}

function searchChrome(dir, depth = 0) {
  if (depth > 4) return null;
  let entries = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return null;
  }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isFile() && /^(chrome|headless_shell)(\.exe)?$/i.test(e.name)) return p;
  }
  for (const e of entries) {
    if (e.isDirectory()) {
      const hit = searchChrome(p, depth + 1);
      if (hit) return hit;
    }
  }
  return null;
}

const chromePath = findChrome();
if (chromePath) console.log(`Chrome: ${chromePath}`);
else console.log("Chrome: system default (no bundled chromium found)");

let failed = false;
for (const url of urls) {
  console.log(`\nLighthouse: ${url} (mobile)`);
  try {
    const args = [
      "lighthouse",
      url,
      "--output=json",
      "--output-path=stdout",
      "--only-categories=performance,accessibility,best-practices,seo",
      "--form-factor=mobile",
      "--throttling-method=simulate",
      "--chrome-flags=--headless --no-sandbox --disable-gpu",
      "--quiet",
    ];
    if (chromePath) args.push(`--chrome-path=${chromePath}`);
    const { stdout } = await run(NPX, args, {
      maxBuffer: 32 * 1024 * 1024,
      shell: process.platform === "win32",
    });
    const json = JSON.parse(stdout.slice(stdout.indexOf("{")));
    for (const [cat, min] of Object.entries(thresholds)) {
      // Authenticated application screens are intentionally disallowed in
      // robots.txt. An SEO score for those URLs is therefore not actionable.
      if (cat === "seo" && new URL(url).pathname === "/dashboard") {
        console.log("  seo: N/A (authenticated route; intentionally noindex)");
        continue;
      }
      const score = Math.round((json.categories?.[cat]?.score ?? 0) * 100);
      const ok = score >= min;
      console.log(`  ${cat}: ${score} (min ${min}) ${ok ? "PASS" : "FAIL"}`);
      if (!ok) failed = true;
    }
    const audits = json.audits ?? {};
    const metric = (id) => Math.round(audits[id]?.numericValue ?? 0);
    console.log(
      `  FCP ${metric("first-contentful-paint")}ms · LCP ${metric("largest-contentful-paint")}ms · ` +
      `TBT ${metric("total-blocking-time")}ms · CLS ${(audits["cumulative-layout-shift"]?.numericValue ?? 0).toFixed(3)}`
    );
  } catch (e) {
    console.error(`  ERROR: ${String(e.message ?? e).slice(0, 600)}`);
    failed = true;
  }
}
if (failed) {
  console.error("\nLighthouse thresholds missed.");
  process.exit(1);
}
console.log("\nLighthouse: all thresholds passed.");
