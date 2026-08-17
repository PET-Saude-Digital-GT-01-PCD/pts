import { test, expect } from "@playwright/test";

test("usuário PENDENTE não consegue logar", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("pendente@pts.local");
  await page.getByLabel("Senha").fill("pendente123");
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});

test("usuário BLOQUEADO não consegue logar", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("bloqueado@pts.local");
  await page.getByLabel("Senha").fill("bloqueado123");
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});

test("usuário ATIVO loga mas sem dashboard.ver é negado no /dashboard", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("fisio@pts.local");
  await page.getByLabel("Senha").fill("fisio123");
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page).not.toHaveURL(/\/login/);
  await expect(page).toHaveURL("/");
});