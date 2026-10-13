import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/**
 * Accessibility: placement + profile + dashboard have no serious/critical
 * axe violations. Tagged @a11y so `playwright test --grep @a11y` runs only these.
 */
const PAGES = ["/placement", "/dashboard", "/profile", "/smart-path"];

for (const url of PAGES) {
  test(`@a11y ${url} has no serious axe violations`, async ({ page }) => {
    await page.goto(url);
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

test("@a11y placement keyboard: tabs are reachable", async ({ page }) => {
  await page.goto("/placement");
  const start = page.getByRole("button", { name: /start test|continue test/i }).first();
  if (await start.isVisible()) await start.click();
  const tab = page.getByRole("tab").first();
  await expect(tab).toBeVisible();
  await tab.focus();
  await expect(tab).toBeFocused();
});
