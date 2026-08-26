import { test, expect } from "@playwright/test";

const PTS_ATIVO_ID = "00000000-0000-4000-8000-000000000010";
const PTS_FECHADO_ID = "00000000-0000-4000-8000-000000000011";

async function login(
  page: import("@playwright/test").Page,
  email: string,
  senha: string,
) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(senha);
  await page.getByRole("button", { name: "Entrar" }).click();
  // Papéis clínicos sem governanca.dashboard.ver caem em "/", não em /dashboard.
  await page.waitForURL((u) => u.pathname !== "/login");
}

test("usuário com care-plan.meta.ler vê o painel do caso", async ({ page }) => {
  await login(page, "fisio@pts.local", "fisio123");
  await page.goto(`/casos/${PTS_ATIVO_ID}`);

  await expect(page.getByRole("heading", { name: "Maria Exemplo" })).toBeVisible();
  await expect(page.getByTestId("status-pts")).toHaveText("Em avaliação");
  await expect(page.getByText("Equipe/CER:")).toBeVisible();

  // abas navegam
  await page.getByRole("tab", { name: "Metas" }).click();
  await expect(page).toHaveURL(new RegExp(`\\?aba=metas$`));
  await expect(page.getByTestId("aba-vazia")).toBeVisible();
});

test("timeline mostra a abertura do PTS do seed", async ({ page }) => {
  await login(page, "fisio@pts.local", "fisio123");
  await page.goto(`/casos/${PTS_ATIVO_ID}`);
  await expect(page.getByText("PTS aberto")).toBeVisible();
});

test("PTS fechado exibe banner somente leitura", async ({ page }) => {
  await login(page, "fisio@pts.local", "fisio123");
  await page.goto(`/casos/${PTS_FECHADO_ID}`);
  await expect(page.getByTestId("banner-fechado")).toBeVisible();
  await expect(page.getByTestId("status-pts")).toHaveText("Fechado");
});

test("sem permissão de leitura → redirect para /", async ({ page }) => {
  await login(page, "admin@pts.local", "admin123");
  await page.goto(`/casos/${PTS_ATIVO_ID}`);
  await expect(page).toHaveURL(/\/$/);
});

test("PTS inexistente → 404", async ({ page }) => {
  await login(page, "fisio@pts.local", "fisio123");
  const resposta = await page.goto("/casos/00000000-0000-4000-8000-000000000099");
  expect(resposta?.status()).toBe(404);
});
