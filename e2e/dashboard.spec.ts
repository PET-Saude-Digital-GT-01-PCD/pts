import { test, expect } from "@playwright/test";

const PTS_ATIVO_ID = "00000000-0000-4000-8000-000000000010";

test("clínico vê Meus casos com status, semáforo, alerta e link pro painel", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("fisio@pts.local");
  await page.getByLabel("Senha").fill("fisio123");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15000 });
  await expect(
    page.getByRole("heading", { name: "Meus casos" })
  ).toBeVisible();

  const card = page.locator("a", { hasText: "Maria Exemplo" });
  await expect(card).toBeVisible();
  await expect(card.getByText("Em avaliação")).toBeVisible();
  await expect(card.getByText("Amarelo")).toBeVisible();
  await expect(card.getByText("1 meta com prazo vencido")).toBeVisible();

  await expect(
    card.getAttribute("href")
  ).resolves.toBe(`/casos/${PTS_ATIVO_ID}`);
});

test("gestor/admin vê agregados do CER", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("admin@pts.local");
  await page.getByLabel("Senha").fill("admin123");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15000 });
  await expect(
    page.getByRole("heading", { name: "Visão geral" })
  ).toBeVisible();
  await expect(page.getByText("Total de PTS")).toBeVisible();
});

test("visitante não autenticado cai no login", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login(\?|$)/);
});
