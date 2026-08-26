import { test, expect } from "@playwright/test";

const PTS_ATIVO_ID = "00000000-0000-4000-8000-000000000010";

async function login(page: import("@playwright/test").Page, email: string, senha: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(senha);
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL((u) => u.pathname !== "/login", { timeout: 15_000 });
}

test("aba Metas do painel agrupa por especialidade e sinaliza conflitos sem bloquear (#20)", async ({
  page,
}) => {
  await login(page, "fisio@pts.local", "fisio123");
  await page.goto(`/casos/${PTS_ATIVO_ID}?aba=metas`);

  await expect(page.getByTestId("metas-cruzadas")).toBeVisible();

  // agrupamento por especialidade
  await expect(
    page.getByRole("heading", { name: "FISIOTERAPEUTA" })
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "MEDICO" })).toBeVisible();

  // conflito sinalizado (mesmo domínio "mobilidade", especialidades diferentes)
  await expect(page.getByTestId("resumo-conflitos")).toContainText("conflito");
  // par seed gera FOCO (1 conflito) → badge nos dois lados; outros pares podem somar
  const badges = page.locator('[data-testid^="conflito-"]');
  expect(await badges.count()).toBeGreaterThanOrEqual(2);

  // nunca bloqueia: formulário de nova meta segue disponível
  await expect(page.getByRole("button", { name: "Nova meta" })).toBeEnabled();
});

test("tela /metas?ptsId= lista o painel cruzado (#20)", async ({ page }) => {
  await login(page, "fisio@pts.local", "fisio123");
  await page.goto(`/metas?ptsId=${PTS_ATIVO_ID}`);

  await expect(
    page.getByRole("heading", { name: /painel cruzado/i })
  ).toBeVisible();
  await expect(page.getByTestId("metas-cruzadas")).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Voltar ao painel/ })
  ).toBeVisible();
});

test("/metas exige care-plan.meta.ler → admin é redirecionado", async ({
  page,
}) => {
  await login(page, "admin@pts.local", "admin123");
  await page.goto(`/metas?ptsId=${PTS_ATIVO_ID}`);
  await expect(page).toHaveURL(/\/$/);
});
