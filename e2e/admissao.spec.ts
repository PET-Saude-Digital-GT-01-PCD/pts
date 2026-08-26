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

test("usuário ATIVO sem dashboard.ver vê a visão clínica do /dashboard (#24)", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("fisio@pts.local");
  await page.getByLabel("Senha").fill("fisio123");
  await page.getByRole("button", { name: "Entrar" }).click();

  // Papel clínico agora tem visão própria ("Meus casos"); não é mais negado.
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15000 });
  await expect(
    page.getByRole("heading", { name: "Meus casos" })
  ).toBeVisible();
});