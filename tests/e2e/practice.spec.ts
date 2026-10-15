import { expect, test } from "@playwright/test";

test.describe("universal practice lab", () => {
  test("daily practice renders, grades and advances", async ({ page }) => {
    await page.goto("/practice");
    await expect(page).toHaveURL(/\/practice$/);
    await expect(page.getByRole("heading", { name: "Practice Lab" })).toBeVisible();
    await page.getByRole("button", { name: "grammar", exact: true }).click();
    const choice = page.getByRole("radio").first();
    await expect(choice).toBeVisible();
    await choice.click();
    await page.getByRole("button", { name: "Check answer" }).click();
    await expect(page.getByText(/correct|not yet/i).first()).toBeVisible();
  });

  test("has no horizontal overflow on mobile", async ({ page }) => {
    await page.goto("/practice");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
