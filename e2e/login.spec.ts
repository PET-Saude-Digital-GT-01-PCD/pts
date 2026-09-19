import { test, expect } from "@playwright/test";

test("login redireciona para /dashboard com usuário do seed", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("admin@pts.local");
  await page.getByLabel("Senha").fill("admin123");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 });
  await expect(
    page.getByRole("heading", { name: "Visão geral" })
  ).toBeVisible();
});

test("senha incorreta mostra erro e permanece no login", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("admin@pts.local");
  await page.getByLabel("Senha").fill("senha-errada");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});

test("rota /dashboard exige autenticação", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
});
test("login de usuário clínico (não-admin) cai na visão clínica, sem área admin (#101)", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("medico@pts.local");
  await page.getByLabel("Senha").fill("medico123");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 });
  await expect(page.getByRole("heading", { name: "Meus casos" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Visão geral" })).toHaveCount(0);

  // sem admin.usuarios.ver: a área administrativa devolve para o dashboard
  await page.goto("/dashboard/usuarios");
  await expect(page).toHaveURL(/\/dashboard$/);
});
