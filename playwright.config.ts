import { defineConfig, devices } from "@playwright/test";

const e2ePort = process.env.E2E_PORT ?? "3000";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  // runner de CI tem 2 vCPU: paralelismo alto derruba o next start sob carga
  workers: process.env.CI ? 2 : undefined,
  timeout: 45_000,
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
    // com output: "standalone", "next start" não serve os assets/rotas
    // corretamente — precisamos rodar o server.js gerado pelo build e
    // copiar manualmente public/ e .next/static/ pra dentro do standalone,
    // já que o Next não faz isso sozinho.
    command: `cp -r public .next/standalone/public && cp -r .next/static .next/standalone/.next/static && AUTH_URL=http://localhost:${e2ePort} PORT=${e2ePort} node .next/standalone/server.js`,
    url: `http://localhost:${e2ePort}/api/health`,
    reuseExistingServer: true,
    timeout: 60_000,
  },
});