import { test, expect } from "@playwright/test";

test("gestor/admin vê indicadores de governança com status e fonte", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("admin@pts.local");
  await page.getByLabel("Senha").fill("admin123");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15000 });

  await page.goto("/governanca");
  await expect(
    page.getByRole("heading", { name: "Indicadores de governança" })
  ).toBeVisible();

  const northStar = page.getByTestId("indicador-north-star");
  await expect(northStar).toBeVisible();
  await expect(northStar.getByText("PTS ativos com revisão em dia e ≥1 meta")).toBeVisible();
  await expect(northStar.getByText("Fonte: pts, pts_revisao, meta")).toBeVisible();

  // Indicadores que dependem da fila outbound (#63/#64, ainda não integrada): sem dado.
  const pendenciaSync = page.getByTestId("indicador-pendencia-sync");
  await expect(pendenciaSync).toBeVisible();
  await expect(pendenciaSync.getByText("Sem dado")).toBeVisible();
  await expect(pendenciaSync.getByText("—", { exact: true })).toBeVisible();
});

test("filtro de período recarrega os indicadores", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("admin@pts.local");
  await page.getByLabel("Senha").fill("admin123");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15000 });

  await page.goto("/governanca");
  await expect(page.getByTestId("lista-indicadores")).toBeVisible();

  await page.getByLabel("Desde").fill("2020-01-01");
  await page.getByLabel("Até").fill("2020-01-31");
  await page.getByRole("button", { name: "Aplicar período" }).click();

  // Sem eventos nesse período: adesão fica sem dado.
  const adesao = page.getByTestId("indicador-adesao");
  await expect(adesao.getByText("Sem dado")).toBeVisible({ timeout: 10000 });
});

test("exportar CSV baixa arquivo com nome previsível", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("admin@pts.local");
  await page.getByLabel("Senha").fill("admin123");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15000 });

  await page.goto("/governanca");
  await expect(page.getByTestId("lista-indicadores")).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar CSV" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^indicadores-governanca-\d{4}-\d{2}-\d{2}-a-\d{4}-\d{2}-\d{2}\.csv$/);
});

test("usuário sem permissão de governança é redirecionado", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("fisio@pts.local");
  await page.getByLabel("Senha").fill("fisio123");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15000 });

  await page.goto("/governanca");
  await expect(page).toHaveURL(/\/$/);
});
