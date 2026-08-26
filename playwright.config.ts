import { defineConfig, devices } from "@playwright/test";

const e2ePort = process.env.E2E_PORT ?? "3000";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? `http://localhost:${e2ePort}`,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    // ponytail: porta configurável p/ conviver com outros servidores na 3000;
    // AUTH_URL acompanha a porta ou o redirect de login volta pra 3000
    command: `pnpm build && AUTH_URL=http://localhost:${e2ePort} pnpm exec next start -p ${e2ePort}`,
    url: `http://localhost:${e2ePort}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
