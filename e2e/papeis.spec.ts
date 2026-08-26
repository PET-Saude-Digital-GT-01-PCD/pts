import { test, expect } from "@playwright/test";

async function loginAdmin(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("admin@pts.local");
  await page.getByLabel("Senha").fill("admin123");
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

  await expect(page.getByText(/recurso clínico/i)).toBeVisible();
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
  const linha = page.locator('[data-email="fisio@pts.local"]');
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
  await page.getByRole("button", { name: "Entrar" }).click();

  // #24: clínico tem dashboard próprio, mas área admin continua negada.
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(
    page.getByRole("heading", { name: "Meus casos" })
  ).toBeVisible();
});