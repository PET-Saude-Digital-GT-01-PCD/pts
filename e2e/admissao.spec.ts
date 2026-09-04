import { test, expect } from "@playwright/test";

// ===== Cenários existentes (Bloco A) =====

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

// ===== Bloco B — autocadastro dinâmico e aprovação =====

// E-mail único gerado por execução de teste para evitar colisões
const EMAIL_NOVO = `e2e_novo_${Date.now()}@teste.local`;

test("Bloco B: autocadastro → PENDENTE bloqueia login", async ({ page }) => {
  // 1. Acessa /cadastro sem estar logado
  await page.goto("/cadastro");
  await expect(page.getByRole("button", { name: /solicitar acesso/i })).toBeVisible();

  // 2. Preenche os campos do formulário dinâmico
  const nomeInput = page.locator("#campo-nome");
  const emailInput = page.locator("#campo-email");
  const senhaInput = page.locator("#campo-senha");
  const categoriaSelect = page.locator("#campo-categoria");

  await nomeInput.fill("Novo Profissional E2E");
  await emailInput.fill(EMAIL_NOVO);
  await senhaInput.fill("Senha@123");
  await categoriaSelect.selectOption("FISIOTERAPEUTA");

  // 3. Submete → tela de sucesso
  await page.getByRole("button", { name: /solicitar acesso/i }).click();
  await expect(page.getByTestId("cadastro-sucesso")).toBeVisible({ timeout: 10000 });

  // 4. Tenta logar com o novo usuário → bloqueado (PENDENTE)
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(EMAIL_NOVO);
  await page.getByLabel("Senha").fill("Senha@123");
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});

test("Bloco B: admin aprova usuário → login funciona", async ({ page }) => {
  // Pré-condição: o usuário criado no teste anterior já existe no banco (seed+autocadastro).
  // Para garantir isolamento, cria um novo via /cadastro.
  const emailAprovado = `e2e_aprovar_${Date.now()}@teste.local`;

  // Autocadastro
  await page.goto("/cadastro");
  await page.locator("#campo-nome").fill("Para Aprovar E2E");
  await page.locator("#campo-email").fill(emailAprovado);
  await page.locator("#campo-senha").fill("Aprovado@1");
  await page.locator("#campo-categoria").selectOption("RECEPCAO");
  await page.getByRole("button", { name: /solicitar acesso/i }).click();
  await expect(page.getByTestId("cadastro-sucesso")).toBeVisible({ timeout: 10000 });

  // Login como admin
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("admin@pts.local");
  await page.getByLabel("Senha").fill("admin123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15000 });

  // Navega para gerenciamento de usuários
  await page.goto("/dashboard/usuarios");
  const filaPendentes = page.getByTestId("fila-pendentes");
  await expect(filaPendentes).toBeVisible();

  // Localiza o usuário pelo email e clica em Aprovar
  const cardUsuario = filaPendentes.locator(`[data-email="${emailAprovado}"]`);
  await expect(cardUsuario).toBeVisible();
  await cardUsuario.getByRole("button", { name: "Aprovar" }).click();

  // Aguarda a página atualizar (revalidatePath) e o card sumir da fila
  await expect(cardUsuario).not.toBeVisible({ timeout: 10000 });

  // Faz logout
  await page.context().clearCookies();
  await page.goto("/login");

  // Login com o usuário aprovado
  await page.getByLabel("E-mail").fill(emailAprovado);
  await page.getByLabel("Senha").fill("Aprovado@1");
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15000 });
});

test("Bloco B: admin rejeita com motivo → usuário BLOQUEADO não loga", async ({ page }) => {
  const emailRejeitado = `e2e_rejeitar_${Date.now()}@teste.local`;

  // Autocadastro
  await page.goto("/cadastro");
  await page.locator("#campo-nome").fill("Para Rejeitar E2E");
  await page.locator("#campo-email").fill(emailRejeitado);
  await page.locator("#campo-senha").fill("Rejeitar@1");
  await page.locator("#campo-categoria").selectOption("TRIADOR");
  await page.getByRole("button", { name: /solicitar acesso/i }).click();
  await expect(page.getByTestId("cadastro-sucesso")).toBeVisible({ timeout: 10000 });

  // Login como admin
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("admin@pts.local");
  await page.getByLabel("Senha").fill("admin123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15000 });

  await page.goto("/dashboard/usuarios");
  const filaPendentes = page.getByTestId("fila-pendentes");
  await expect(filaPendentes).toBeVisible();

  const cardUsuario = filaPendentes.locator(`[data-email="${emailRejeitado}"]`);
  await expect(cardUsuario).toBeVisible();

  // Clica em Rejeitar para abrir o formulário de motivo
  await cardUsuario.getByRole("button", { name: "Rejeitar" }).click();

  // Botão "Confirmar rejeição" bloqueado sem motivo
  const btnConfirmar = cardUsuario.getByRole("button", { name: /confirmar rejeição/i });
  await expect(btnConfirmar).toBeDisabled();

  // Preenche motivo insuficiente → ainda bloqueado
  const motivoArea = cardUsuario.locator("textarea");
  await motivoArea.fill("Curto");
  await expect(btnConfirmar).toBeDisabled();

  // Preenche motivo válido (≥ 10 chars)
  await motivoArea.fill("Documentação incompleta no formulário de cadastro.");
  await expect(btnConfirmar).toBeEnabled();
  await btnConfirmar.click();

  // Card some da fila
  await expect(cardUsuario).not.toBeVisible({ timeout: 10000 });

  // Faz logout e tenta logar com usuário rejeitado
  await page.context().clearCookies();
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(emailRejeitado);
  await page.getByLabel("Senha").fill("Rejeitar@1");
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});