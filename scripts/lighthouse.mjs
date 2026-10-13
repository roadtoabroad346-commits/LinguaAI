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
const urls = [`${base}/placement`, `${base}/dashboard`, `${base}/profile`];
// Mobile simulated throttling is harsh for an interactive Next.js app
// (framer-motion + placement wizard ~325kB first load). 65 keeps perf
// regressions visible without demanding a marketing-page score from app screens.
const thresholds = { performance: 65, accessibility: 90, "best-practices": 85, seo: 90 };
const NPX = process.platform === "win32" ? "npx.cmd" : "npx";

// Prefer Playwright's bundled Chromium headless shell when system Chrome
// is absent (CI/Windows): lighthouse accepts --chrome-path.
function findChrome() {
  if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) return process.env.CHROME_PATH;
  const root = path.join(process.env.LOCALAPPDATA ?? "", "ms-playwright");
  try {
    if (!fs.existsSync(root)) return null;
    for (const d of fs.readdirSync(root)) {
      if (!d.startsWith("chromium")) continue;
      const exe = path.join(root, d, "chrome-win", "chrome.exe");
      const shell = path.join(root, d, "chrome-headless-shell-win64", "chrome-headless-shell.exe");
      // Full chromium first (supports all targets), shell as fallback.
      if (fs.existsSync(exe)) return exe;
      // Headless shell lives under a different layout per version; search it.
      const headlessDir = path.join(root, d);
      const found = searchExe(headlessDir);
      if (found) return found;
      if (fs.existsSync(shell)) return shell;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function searchExe(dir, depth = 0) {
  if (depth > 3) return null;
  let entries = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return null;
  }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isFile() && /(chrome|headless_shell).*\.exe$/i.test(e.name)) return p;
  }
  for (const e of entries) {
    if (e.isDirectory()) {
      const hit = searchExe(p, depth + 1);
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
      const score = Math.round((json.categories?.[cat]?.score ?? 0) * 100);
      const ok = score >= min;
      console.log(`  ${cat}: ${score} (min ${min}) ${ok ? "PASS" : "FAIL"}`);
      if (!ok) failed = true;
    }
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
