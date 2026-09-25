import { test, expect } from "@playwright/test";

// Rota /metas acessada direto (#112). Acesso e redirect por permissão já
// estão em conflitos-metas.spec.ts; aqui: sem ptsId, conteúdo e navegação.

const PTS_ATIVO_ID = "00000000-0000-4000-8000-000000000010";

test.beforeEach(async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("fisio@pts.local");
  await page.getByLabel("Senha").fill("fisio123");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL((u) => u.pathname !== "/login", { timeout: 15_000 });
});

test("/metas sem ptsId orienta a informar o caso, sem listar nada", async ({ page }) => {
  await page.goto("/metas");
  await expect(page.getByRole("heading", { name: "Metas do caso" })).toBeVisible();
  await expect(page.getByText("/metas?ptsId=…")).toBeVisible();
  await expect(page.getByTestId("metas-cruzadas")).toHaveCount(0);
});

test("/metas?ptsId= lista as metas do caso (técnica + acessível) e volta ao painel", async ({
  page,
}) => {
  await page.goto(`/metas?ptsId=${PTS_ATIVO_ID}`);

  const painel = page.getByTestId("metas-cruzadas");
  await expect(painel).toBeVisible();
  // metas do seed para o PTS ativo (Maria)
  await expect(
    painel.getByText("Conseguir levantar o braço direito acima da cabeça"),
  ).toBeVisible();
  await expect(painel.getByText("Continuar movimentando o ombro direito sem dor")).toBeVisible();

  await page.getByRole("link", { name: "Voltar ao painel" }).click();
  await expect(page).toHaveURL(`/casos/${PTS_ATIVO_ID}?aba=metas`);
  await expect(page.getByRole("tabpanel").getByTestId("metas-cruzadas")).toBeVisible();
});
