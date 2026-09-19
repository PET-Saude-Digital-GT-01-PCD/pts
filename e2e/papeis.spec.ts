import { test, expect } from "@playwright/test";

async function loginAdmin(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("admin@pts.local");
  await page.getByLabel("Senha").fill("admin123");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

const checkboxPorChave = (page: import("@playwright/test").Page, chave: string) =>
  page
    .locator("label", { hasText: chave })
    .locator('input[type="checkbox"]');

test("guardrail: papel base GESTOR não aceita recurso clínico no save", async ({
  page,
}) => {
  await loginAdmin(page);
  await page.goto("/dashboard/papeis");
  await page.getByLabel("Nome do papel").fill(`COORD ${Date.now()}`);
  await page.getByLabel("Base", { exact: true }).selectOption("GESTOR");
  await checkboxPorChave(page, "clinical.soap.ler").check();
  await page.getByRole("button", { name: "Criar papel" }).click();

  // o erro do guardrail vem no <p role="alert"> do formulário — ancorar no
  // papel evita casar com os textos de apoio da tela, que citam a mesma regra
  await expect(page.locator("form").getByRole("alert")).toContainText(
    /recurso.*clínic/i,
  );
});

test("admin cria papel CLINICO e ele aparece na lista", async ({ page }) => {
  const nome = `AUX ${Date.now()}`;
  await loginAdmin(page);
  await page.goto("/dashboard/papeis");
  await page.getByLabel("Nome do papel").fill(nome);
  await page.getByLabel("Base", { exact: true }).selectOption("CLINICO");
  await checkboxPorChave(page, "care-plan.meta.escrever").check();
  await checkboxPorChave(page, "clinical.soap.ler").check();
  await page.getByRole("button", { name: "Criar papel" }).click();

  await expect(page.getByRole("status")).toBeVisible();
  await expect(page.getByText(nome)).toBeVisible();
});

test("clínico sem admin não acessa /dashboard/usuarios (#24)", async ({
  page,
}) => {
  await loginAdmin(page);
  await page.goto("/dashboard/usuarios");
  // Usa medico@pts.local: já é MEDICO, então o if abaixo é no-op e o papel
  // do fisio@pts.local não é mutado (outros specs dependem dele).
  const linha = page.locator('[data-email="medico@pts.local"]');
  const select = linha.locator("select");
  const papelMedico = await select
    .locator("option")
    .filter({ hasText: "MEDICO" })
    .getAttribute("value");
  const atual = await select.inputValue();
  if (papelMedico && papelMedico !== atual) {
    await select.selectOption(papelMedico);
    await linha.getByRole("button", { name: "Salvar" }).click();
    await expect(linha.getByText("salvo")).toBeVisible();
  }

  await page.context().clearCookies();
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("fisio@pts.local");
  await page.getByLabel("Senha").fill("fisio123");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Entrar" }).click();

  // #24: clínico tem dashboard próprio, mas área admin continua negada.
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(
    page.getByRole("heading", { name: "Meus casos" })
  ).toBeVisible();
});
test("detalhe do papel: edita recursos e descrição, persiste após recarregar e exclui (#111)", async ({
  page,
}) => {
  const nome = `DETALHE ${Date.now()}`;
  await loginAdmin(page);
  await page.goto("/dashboard/papeis");
  await page.getByLabel("Nome do papel").fill(nome);
  await page.getByLabel("Base", { exact: true }).selectOption("CLINICO");
  await checkboxPorChave(page, "clinical.soap.ler").check();
  await page.getByRole("button", { name: "Criar papel" }).click();
  await expect(page.getByRole("status")).toBeVisible();

  await page.getByRole("link", { name: new RegExp(nome) }).click();
  await expect(page).toHaveURL(/\/dashboard\/papeis\/[0-9a-f-]{36}$/);
  await expect(page.getByLabel("Nome do papel")).toHaveValue(nome);
  await expect(checkboxPorChave(page, "clinical.soap.ler")).toBeChecked();

  await page.getByLabel("Descrição").fill("Editado pelo e2e");
  await checkboxPorChave(page, "clinical.soap.ler").uncheck();
  await checkboxPorChave(page, "care-plan.meta.ler").check();
  await page.getByRole("button", { name: "Salvar alterações" }).click();
  await expect(page.getByRole("status")).toContainText("Alterações salvas.");

  await page.reload();
  await expect(page.getByLabel("Descrição")).toHaveValue("Editado pelo e2e");
  await expect(checkboxPorChave(page, "care-plan.meta.ler")).toBeChecked();
  await expect(checkboxPorChave(page, "clinical.soap.ler")).not.toBeChecked();

  // papel sem usuários pode ser excluído (também limpa o dado do teste)
  await page.getByRole("button", { name: "Excluir" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Excluir" }).click();
  await expect(page).toHaveURL(/\/dashboard\/papeis$/);
  await expect(page.getByText(nome)).toHaveCount(0);
});

test("detalhe de papel inexistente responde 404 (#111)", async ({ page }) => {
  await loginAdmin(page);
  const resposta = await page.goto("/dashboard/papeis/00000000-0000-4000-8000-00000000dead");
  expect(resposta?.status()).toBe(404);
});
