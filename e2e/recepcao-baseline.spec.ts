import { test, expect } from "@playwright/test";

test.describe("Recepção — Linha de Base Clínica", () => {
  test.beforeEach(async ({ page }) => {
    // Login com usuário recepcao
    await page.goto("/login");
    await page.getByLabel("E-mail").fill("recepcao@pts.local");
    await page.getByLabel("Senha").fill("recepcao123");
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    // Navegar para a tela de novo paciente
    await page.goto("/recepcao/novo");
    await expect(page).toHaveURL(/\/recepcao\/novo/);
  });

  test("busca CPF conhecido e exibe dados importados com badge correto", async ({ page }) => {
    // Preencher CPF e buscar (usando mock COMPLETO)
    await page.getByLabel("CPF", { exact: true }).fill("529.982.247-25");
    await page.getByRole("button", { name: /Buscar/i }).click();

    // Aguardar a mensagem de sucesso
    await expect(page.getByText("Dados encontrados no e-SUS e importados.")).toBeVisible({ timeout: 10_000 });

    // Nome e data de nascimento devem ser preenchidos e destacados
    await expect(page.getByLabel("Nome completo")).toHaveValue("Maria Exemplo da Silva");
    await expect(page.getByLabel("Nome completo")).toHaveClass(/bg-sky-50/);

    // Diagnósticos devem aparecer preenchidos
    await expect(page.getByLabel("Diagnósticos")).toHaveValue(/Paralisia cerebral quadriplégica/);
    await expect(page.getByLabel("Diagnósticos")).toHaveClass(/bg-sky-50/);
  });

  test("CPF desconhecido exibe alerta de não encontrado", async ({ page }) => {
    await page.getByLabel("CPF", { exact: true }).fill("999.999.999-99");
    await page.getByRole("button", { name: /Buscar/i }).click();

    await expect(page.getByText("Nenhum registro encontrado no e-SUS")).toBeVisible({ timeout: 10_000 });
  });

  test("campo editado perde o destaque de importado e volta ao normal", async ({ page }) => {
    await page.getByLabel("CPF", { exact: true }).fill("529.982.247-25");
    await page.getByRole("button", { name: /Buscar/i }).click();
    await expect(page.getByText("Dados encontrados no e-SUS e importados.")).toBeVisible({ timeout: 10_000 });

    // Editar a descrição de diagnósticos
    const inputDiag = page.getByLabel("Diagnósticos");
    await inputDiag.fill("Paralisia cerebral editada");

    // O campo perde a classe bg-sky-50 porque foi editado (origem vira 'digitado')
    await expect(inputDiag).not.toHaveClass(/bg-sky-50/);
  });
});
