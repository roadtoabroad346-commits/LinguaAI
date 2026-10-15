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

  test("handles an empty API failure without exposing a JSON parser error", async ({ page }) => {
    await page.route("**/api/practice/session", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({ status: 500, contentType: "application/json", body: "" });
        return;
      }
      await route.continue();
    });

    await page.goto("/practice");
    await page.getByRole("button", { name: "grammar", exact: true }).click();
    await page.getByRole("radio").first().click();
    await page.getByRole("button", { name: "Check answer" }).click();

    const alert = page.getByRole("alert").filter({ hasText: "Your answer could not be saved" });
    await expect(alert).toBeVisible();
    await expect(page.getByText("Unexpected end of JSON input", { exact: false })).toHaveCount(0);
  });
});
