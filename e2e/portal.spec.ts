import { test, expect } from "@playwright/test";

const PTS_ATIVO_ID = "00000000-0000-4000-8000-000000000010";

test("equipe visualiza o portal do cidadão a partir do caso", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("fisio@pts.local");
  await page.getByLabel("Senha").fill("fisio123");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15000 });

  await page.goto(`/casos/${PTS_ATIVO_ID}`);
  await page.getByRole("link", { name: "Ver como portal do cidadão" }).click();
  await expect(page).toHaveURL(`/portal/${PTS_ATIVO_ID}`);

  await expect(page.getByRole("heading", { name: "Maria Exemplo" })).toBeVisible();

  // PTS está EM_AVALIACAO no seed: primeira etapa é a atual.
  const etapaAtual = page.getByTestId("etapa-EM_AVALIACAO");
  await expect(etapaAtual).toHaveAttribute("aria-current", "step");
  await expect(etapaAtual.getByText("você está aqui")).toBeVisible();

  const metaAndamento = page.getByTestId("meta-portal-00000000-0000-4000-8000-00000000cc01");
  await expect(metaAndamento.getByText("Conseguir levantar o braço direito acima da cabeça")).toBeVisible();
  await expect(metaAndamento.getByText("Em andamento")).toBeVisible();

  const metaNova = page.getByTestId("meta-portal-00000000-0000-4000-8000-00000000cc02");
  await expect(metaNova.getByText("Continuar movimentando o ombro direito sem dor")).toBeVisible();
  await expect(metaNova.getByText("Combinada")).toBeVisible();

  // linguagem acessível: sem termos técnicos como "goniometria"/"flexão"
  await expect(page.getByText("goniometria", { exact: false })).toHaveCount(0);
});

test("visitante não autenticado é redirecionado ao tentar abrir o portal", async ({ page }) => {
  await page.goto(`/portal/${PTS_ATIVO_ID}`);
  await expect(page).toHaveURL(/\/login(\?|$)/);
});
