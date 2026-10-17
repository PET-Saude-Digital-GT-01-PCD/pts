import { test, expect } from "@playwright/test";

const PTS_ATIVO_ID = "00000000-0000-4000-8000-000000000010";
const PACIENTE_ATIVO_ID = "00000000-0000-4000-8000-000000000002";

async function login(page: import("@playwright/test").Page, email: string, senha: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(senha);
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15000 });
}

test("equipe visualiza o portal do cidadão a partir do caso", async ({ page }) => {
  await login(page, "fisio@pts.local", "fisio123");

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

test("visitante não autenticado vai para a entrada do portal", async ({ page }) => {
  await page.goto(`/portal/${PTS_ATIVO_ID}`);
  await expect(page).toHaveURL(/\/portal$/);
});

test("recepção emite código e o cidadão entra sem conta", async ({ page, browser }) => {
  await login(page, "recepcao@pts.local", "recepcao123");

  await page.goto(`/pacientes/${PACIENTE_ATIVO_ID}`);
  await page.getByRole("button", { name: "Emitir código de acesso" }).click();
  const caixa = page.getByTestId("acesso-emitido");
  await expect(caixa).toBeVisible();
  const codigo = (await page.getByTestId("codigo-portal").innerText()).trim();
  expect(codigo).toHaveLength(10);

  // Outro aparelho, sem sessão da equipe: só o código impresso.
  const contexto = await browser.newContext({ baseURL: new URL(page.url()).origin });
  const cidadao = await contexto.newPage();
  await cidadao.goto(`/portal?acesso=${codigo}&pts=${PTS_ATIVO_ID}`);
  await expect(cidadao).toHaveURL(`/portal/${PTS_ATIVO_ID}`);
  await expect(cidadao.getByRole("heading", { name: "Maria Exemplo" })).toBeVisible();
  await expect(cidadao.getByRole("button", { name: "Sair do portal" })).toBeVisible();

  await cidadao.getByRole("button", { name: "Sair do portal" }).click();
  await expect(cidadao).toHaveURL(/\/portal$/);
  await expect(cidadao.getByTestId("erro-portal")).toHaveCount(0);
  await contexto.close();
});

