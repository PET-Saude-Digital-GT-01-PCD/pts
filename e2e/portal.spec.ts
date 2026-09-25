import { test, expect } from "@playwright/test";

const PTS_ATIVO_ID = "00000000-0000-4000-8000-000000000010";
const PACIENTE_MARIA_ID = "00000000-0000-4000-8000-000000000002";
const PACIENTE_JOAO_ID = "00000000-0000-4000-8000-000000000003";

async function entrarComoFisio(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("fisio@pts.local");
  await page.getByLabel("Senha").fill("fisio123");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15000 });
}

async function entrarComoRecepcao(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("recepcao@pts.local");
  await page.getByLabel("Senha").fill("recepcao123");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15000 });
}

async function gerarLink(page: import("@playwright/test").Page): Promise<string> {
  await page.goto(`/casos/${PTS_ATIVO_ID}`);
  const bloco = page.getByTestId("bloco-acesso-cidadao");
  await expect(bloco).toBeVisible();
  await bloco.getByTestId("gerar-link-cidadao").click();
  const campo = bloco.getByTestId("link-gerado");
  await expect(campo).toBeVisible({ timeout: 15000 });
  return campo.inputValue();
}

test("equipe visualiza o portal do cidadão a partir do caso", async ({ page }) => {
  await entrarComoFisio(page);

  await page.goto(`/casos/${PTS_ATIVO_ID}`);
  await page.getByRole("link", { name: "Abrir portal do cidadão" }).click();
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

test("visitante não autenticado é redirecionado ao tentar abrir a visão da equipe", async ({ page }) => {
  await page.goto(`/portal/${PTS_ATIVO_ID}`);
  await expect(page).toHaveURL(/\/login(\?|$)/);
});

test("cidadão acessa o próprio PTS pelo link, sem conta", async ({ page, context }) => {
  await entrarComoFisio(page);
  const link = await gerarLink(page);
  expect(link).toContain("/portal-cidadao/");

  // mesmo navegador, agora sem sessão: contexto anônimo
  await context.clearCookies();
  await page.goto(link);

  await expect(page.getByRole("heading", { name: "Maria Exemplo" })).toBeVisible();
  await expect(page.getByTestId("etapa-EM_AVALIACAO")).toHaveAttribute(
    "aria-current",
    "step",
  );
  await expect(
    page.getByText("Conseguir levantar o braço direito acima da cabeça"),
  ).toBeVisible();
  // sem dados clínicos crus nem navegação da equipe
  await expect(page.getByText("goniometria", { exact: false })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Abrir portal do cidadão" })).toHaveCount(0);
});

test("recepção gera o link pela ficha do paciente e o cidadão abre sem conta", async ({
  page,
  context,
}) => {
  await entrarComoRecepcao(page);

  await page.goto(`/pacientes/${PACIENTE_MARIA_ID}`);
  const bloco = page.getByTestId("bloco-acesso-cidadao");
  await expect(bloco).toBeVisible();
  await expect(
    bloco.getByRole("heading", { name: "Acesso do cidadão" }),
  ).toBeVisible();

  await bloco.getByTestId("gerar-link-cidadao").click();
  const campo = bloco.getByTestId("link-gerado");
  await expect(campo).toBeVisible({ timeout: 15000 });
  const link = await campo.inputValue();
  expect(link).toContain("/portal-cidadao/");

  await context.clearCookies();
  await page.goto(link);
  await expect(page.getByRole("heading", { name: "Maria Exemplo" })).toBeVisible();
  await expect(
    page.getByText("Conseguir levantar o braço direito acima da cabeça"),
  ).toBeVisible();
});

test("ficha sem caso em andamento explica quando o link fica disponível", async ({
  page,
}) => {
  await entrarComoRecepcao(page);
  await page.goto(`/pacientes/${PACIENTE_JOAO_ID}`);
  await expect(page.getByTestId("acesso-cidadao-aguarda-caso")).toContainText(
    "depois que a triagem abrir o caso",
  );
  await expect(page.getByTestId("bloco-acesso-cidadao")).toHaveCount(0);
});

test("card da fila da recepção leva à ficha do paciente, não ao painel do caso", async ({
  page,
}) => {
  await entrarComoRecepcao(page);
  await page.goto("/dashboard");
  const card = page.getByRole("link", { name: /Maria Exemplo/ }).first();
  if ((await card.count()) === 0) return;
  await card.click();
  await expect(page).toHaveURL(new RegExp(`/pacientes/${PACIENTE_MARIA_ID}`));
  await expect(page.getByTestId("bloco-acesso-cidadao")).toBeVisible();
});

test("código inexistente mostra recado e não expõe dados", async ({ page }) => {
  await page.goto("/portal-cidadao/ABCDE-FGHJK");
  await expect(page.getByTestId("portal-cidadao-indisponivel")).toBeVisible();
  await expect(page.getByRole("heading", { name: /não foi possível abrir/i })).toBeVisible();
  await expect(page.getByTestId("lista-metas-portal")).toHaveCount(0);
});

test("gerar novo link invalida o link anterior", async ({ page, context }) => {
  await entrarComoFisio(page);
  const linkAntigo = await gerarLink(page);

  const linkNovo = await gerarLink(page);
  expect(linkNovo).not.toBe(linkAntigo);

  await context.clearCookies();
  await page.goto(linkAntigo);
  await expect(page.getByTestId("portal-cidadao-indisponivel")).toContainText(
    "substituído",
  );

  await page.goto(linkNovo);
  await expect(page.getByRole("heading", { name: "Maria Exemplo" })).toBeVisible();

  // a equipe vê o último acesso registrado
  await entrarComoFisio(page);
  await page.goto(`/casos/${PTS_ATIVO_ID}`);
  await expect(page.getByTestId("link-ultimo-acesso")).toContainText("acesso(s)");
});
