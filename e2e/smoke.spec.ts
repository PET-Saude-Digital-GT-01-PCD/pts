import { test, expect } from "@playwright/test";

test("home carrega com título do produto", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("PTS Digital");
});

test("healthcheck responde ok", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.ok()).toBeTruthy();
  expect(await res.json()).toMatchObject({ status: "ok", db: "up" });
});
