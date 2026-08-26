import { test, expect } from "@playwright/test";

test("login redireciona para /dashboard com usuário do seed", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("admin@pts.local");
  await page.getByLabel("Senha").fill("admin123");
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(
    page.getByRole("heading", { name: "Visão geral" })
  ).toBeVisible();
});

test("senha incorreta mostra erro e permanece no login", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("admin@pts.local");
  await page.getByLabel("Senha").fill("senha-errada");
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});

test("rota /dashboard exige autenticação", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
});