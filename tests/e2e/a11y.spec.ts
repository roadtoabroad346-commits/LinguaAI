import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/**
 * Accessibility checks must analyze the requested page, never an unnoticed
 * authentication redirect.
 */
const PAGES = ["/", "/placement", "/grammar", "/reading", "/listening", "/pronunciation", "/practice", "/health", "/privacy", "/terms"];

for (const url of PAGES) {
  test(`@a11y ${url} has no serious axe violations`, async ({ page }) => {
    await page.goto(url);
    expect(new URL(page.url()).pathname).toBe(url);
    // Let client hydration settle; placement intro is client-rendered.
    await page.waitForTimeout(800);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    const detail = serious.map((v) => ({
      id: v.id,
      impact: v.impact,
      targets: v.nodes.slice(0, 3).map((n) => n.target),
      html: v.nodes.slice(0, 3).map((n) => n.html?.slice(0, 220)),
    }));
    expect(detail, `axe violations on ${url}: ${JSON.stringify(detail, null, 2)}`).toEqual([]);
  });
}

for (const url of ["/dashboard", "/profile", "/smart-path"]) {
  test(`anonymous ${url} redirects to login`, async ({ page }) => {
    await page.goto(url);
    await expect(page).toHaveURL(/\/login\?next=/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
}

test("PWA manifest and service worker assets are available", async ({ request }) => {
  const [manifest, worker] = await Promise.all([request.get("/manifest.webmanifest"), request.get("/sw.js")]);
  expect(manifest.ok()).toBeTruthy();
  expect(worker.ok()).toBeTruthy();
  expect(await worker.text()).toContain("linguaai-public-v1");
});

test("@a11y placement keyboard: section nav is reachable", async ({ page }) => {
  await page.goto("/placement");
  const start = page.getByRole("button", { name: /start test|continue test/i }).first();
  if (await start.isVisible()) await start.click();
  const nav = page.getByRole("navigation", { name: /placement sections/i });
  await expect(nav).toBeVisible();
  const btn = nav.getByRole("button").first();
  await btn.focus();
  await expect(btn).toBeFocused();
});
