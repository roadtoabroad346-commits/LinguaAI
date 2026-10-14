import { defineConfig, devices } from "@playwright/test";

/**
 * E2E + a11y for LinguaAI. Works against local dev/prod or preview deploys:
 *   BASE_URL=http://localhost:3000 npx playwright test
 * Mobile + desktop in one run; a11y via @axe-core/playwright in specs.
 */
const baseURL = process.env.BASE_URL ?? process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3100";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "mobile-360",
      use: { ...devices["Pixel 5"] },
    },
    {
      name: "mobile-390",
      use: {
        ...devices["Pixel 7"],
        viewport: { width: 390, height: 844 },
      },
    },
    {
      name: "desktop-1440",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
  ],
  webServer: process.env.PW_NO_SERVER
    ? undefined
    : {
        command: process.env.PW_SERVER_CMD ?? "npm run start -- --port 3100",
        url: "http://localhost:3100/",
        reuseExistingServer: true,
        timeout: 120_000,
        env: { ...process.env, PORT: "3100" } as Record<string, string>,
      },
});
