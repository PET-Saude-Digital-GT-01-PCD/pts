import { test, expect } from "@playwright/test";

async function loginAdmin(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("admin@pts.local");
  await page.getByLabel("Senha").fill("admin123");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15000 });
}

async function tentarLogin(
  page: import("@playwright/test").Page,
  email: string,
  senha: string,
) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(senha);
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Entrar" }).click();
}

test("auto-cadastro → PENDENTE bloqueia login → admin aprova → login funciona (#15)", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const email = `candidata-${Date.now()}@pts.local`;
  const senha = "senhaSegura123";

  await page.goto("/cadastro");
  await page.getByLabel("Nome completo").fill("Candidata Aprovação");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(senha);
  await page.getByLabel("Categoria profissional").selectOption("FISIOTERAPEUTA");
  await page.getByRole("button", { name: "Solicitar acesso" }).click();

  await expect(page.getByRole("status")).toContainText(/aguarda aprovação/i);

  // PENDENTE não loga
  await tentarLogin(page, email, senha);
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);

  // admin aprova
  await page.context().clearCookies();
  await loginAdmin(page);
  await page.goto("/dashboard/usuarios");
  const linha = page.getByTestId("pendente-linha").filter({ hasText: email });
  await expect(linha).toBeVisible();
  // #99: o papel profissional é escolhido na própria aprovação — já vem
  // sugerido pela categoria do cadastro. Antes o aprovado ficava com
  // AUTOCADASTRO (zero recursos) até um 2º passo que era esquecido.
  const papel = linha.getByLabel(/Papel de .* ao aprovar/);
  await expect(papel.locator("option:checked")).toHaveText("FISIOTERAPEUTA");
  await linha.getByRole("button", { name: "Aprovar" }).click();
  await expect(linha).not.toBeVisible();

  const linhaAtiva = page.locator('[data-email="' + email + '"]');
  await expect(linhaAtiva.locator("select option:checked")).toHaveText("FISIOTERAPEUTA");

  // loga direto com acesso normal ao dashboard clínico, sem 2º passo
  await page.context().clearCookies();
  await tentarLogin(page, email, senha);
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15000 });
  await expect(page.getByRole("heading", { name: "Meus casos" })).toBeVisible();
});

test("admin rejeita auto-cadastro com motivo → usuário continua bloqueado (#15)", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const email = `candidato-rejeicao-${Date.now()}@pts.local`;
  const senha = "senhaSegura123";

  await page.goto("/cadastro");
  await page.getByLabel("Nome completo").fill("Candidato Rejeição");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(senha);
  await page.getByLabel("Categoria profissional").selectOption("ENFERMEIRO");
  await page.getByRole("button", { name: "Solicitar acesso" }).click();
  await expect(page.getByRole("status")).toContainText(/aguarda aprovação/i);

  await loginAdmin(page);
  await page.goto("/dashboard/usuarios");
  const linha = page.getByTestId("pendente-linha").filter({ hasText: email });
  await expect(linha).toBeVisible();
  await linha.getByRole("button", { name: "Rejeitar" }).click();
  await linha
    .getByLabel(`Motivo da rejeição de Candidato Rejeição`)
    .fill("Documentação incompleta.");
  await linha.getByRole("button", { name: "Confirmar rejeição" }).click();
  await expect(linha).not.toBeVisible();

  // usuário rejeitado continua sem conseguir logar
  await page.context().clearCookies();
  await tentarLogin(page, email, senha);
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});

test("usuário PENDENTE não consegue logar", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("pendente@pts.local");
  await page.getByLabel("Senha").fill("pendente123");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});

test("usuário BLOQUEADO não consegue logar", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("bloqueado@pts.local");
  await page.getByLabel("Senha").fill("bloqueado123");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});

test("usuário ATIVO sem dashboard.ver vê a visão clínica do /dashboard (#24)", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("fisio@pts.local");
  await page.getByLabel("Senha").fill("fisio123");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Entrar" }).click();

  // Papel clínico agora tem visão própria ("Meus casos"); não é mais negado.
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15000 });
  await expect(
    page.getByRole("heading", { name: "Meus casos" })
  ).toBeVisible();
});