import { test, expect, type Page } from "@playwright/test";
import { db as prisma } from "./db";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { lerCsv } from "../tests/governance/csv-helper";

async function entrar(page: Page, email = "admin@pts.local", senha = "admin123") {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(senha);
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15000 });
}
async function abrir(page: Page) {
  await entrar(page); await page.goto("/governanca");
  await expect(page.getByTestId("lista-indicadores")).toBeVisible();
}
async function baixarCsv(page: Page) {
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar CSV" }).click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  if (!stream) throw new Error("Download não disponibilizou conteúdo");
  const partes: Buffer[] = [];
  for await (const parte of stream) partes.push(Buffer.from(parte));
  return { nome: download.suggestedFilename(), conteudo: Buffer.concat(partes).toString("utf8") };
}

test("painel explicita fórmulas, fontes, situação atual e período sem inventar dados", async ({ page }) => {
  await abrir(page);
  await expect(page.getByRole("heading", { name: "Indicadores de governança" })).toBeVisible();
  const northStar = page.getByTestId("indicador-north-star");
  await expect(northStar.getByText("PTS ativos com revisão em dia e ≥1 meta")).toBeVisible();
  await expect(northStar.getByText("Fonte: pts, pts_revisao, meta")).toBeVisible();
  await expect(northStar.getByText("Situação atual", { exact: true })).toBeVisible();
  await expect(northStar.getByText(/^Cálculo:/)).toBeVisible();
  await expect(page.getByTestId("indicador-adesao").getByText("No período aplicado")).toBeVisible();
  const indisponivel = page.getByTestId("indicador-pendencia-sync");
  await expect(indisponivel.getByText("Sem dado", { exact: true })).toBeVisible();
  await expect(indisponivel.getByText("—", { exact: true })).toBeVisible();
  await expect(indisponivel.getByText("Fonte ainda indisponível")).toBeVisible();
  await expect(page.getByTestId("metadados-relatorio")).toContainText("Fortaleza");
});

test("filtros em edição bloqueiam exportação e mantêm o painel aplicado", async ({ page }) => {
  await abrir(page);
  const metadados = page.getByTestId("metadados-relatorio");
  const textoInicial = await metadados.innerText();
  const northStar = await page.getByTestId("indicador-north-star").innerText();
  await page.getByLabel("Desde").fill("2020-01-01");
  await page.getByLabel("Até").fill("2020-01-31");
  await page.getByLabel("Janela de revisão (dias)").fill("30");
  await expect(page.getByRole("button", { name: "Exportar CSV" })).toBeDisabled();
  await expect(page.getByText(/Há filtros ainda não aplicados/)).toBeVisible();
  expect(await metadados.innerText()).toBe(textoInicial);
  expect(await page.getByTestId("indicador-north-star").innerText()).toBe(northStar);
  await page.getByRole("button", { name: "Aplicar período" }).click();
  await expect(metadados).toContainText("01/01/2020 a 31/01/2020");
  await expect(metadados).toContainText("30 dias");
  await expect(page.getByTestId("indicador-adesao").getByText("Sem dado", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Exportar CSV" })).toBeEnabled();
});

test("datas invertidas, vazias e cadência inválida mostram erros e permitem correção", async ({ page }) => {
  await abrir(page);
  const textoInicial = await page.getByTestId("metadados-relatorio").innerText();
  await page.getByLabel("Desde").fill("2024-03-01");
  await page.getByLabel("Até").fill("2024-02-29");
  await page.getByRole("button", { name: "Aplicar período" }).click();
  await expect(page.getByText("A data final deve ser igual ou posterior à data inicial.")).toBeVisible();
  await expect(page.getByLabel("Até")).toHaveAttribute("aria-invalid", "true");
  expect(await page.getByTestId("metadados-relatorio").innerText()).toBe(textoInicial);
  await page.getByLabel("Desde").fill("");
  await page.getByRole("button", { name: "Aplicar período" }).click();
  await expect(page.getByText("Informe uma data inicial válida.")).toBeVisible();
  await page.getByLabel("Desde").fill("2024-02-29");
  await page.getByLabel("Janela de revisão (dias)").fill("0");
  await page.getByRole("button", { name: "Aplicar período" }).click();
  await expect(page.getByText("Informe um número inteiro entre 1 e 365 dias.")).toBeVisible();
  await page.getByLabel("Janela de revisão (dias)").fill("365");
  await page.getByRole("button", { name: "Aplicar período" }).click();
  await expect(page.getByTestId("metadados-relatorio")).toContainText("29/02/2024 a 29/02/2024");
  await expect(page.getByTestId("metadados-relatorio")).toContainText("365 dias");
});

test("atualização pendente informa carregamento e impede operações concorrentes", async ({ page }) => {
  await abrir(page);
  let liberar!: () => void;
  const bloqueio = new Promise<void>((resolve) => { liberar = resolve; });
  await page.route("**/governanca", async (route) => {
    if (route.request().method() === "POST" && route.request().headers()["next-action"]) await bloqueio;
    await route.continue();
  });
  try {
    await page.getByLabel("Desde").fill("2020-01-01");
    await page.getByLabel("Até").fill("2020-01-31");
    await page.getByRole("button", { name: "Aplicar período" }).click();
    await expect(page.getByRole("status")).toContainText("Atualizando indicadores");
    await expect(page.getByLabel("Desde")).toBeDisabled();
    await expect(page.getByLabel("Até")).toBeDisabled();
    await expect(page.getByRole("button", { name: "Exportar CSV" })).toBeDisabled();
    await expect(page.getByRole("region", { name: "Indicadores", exact: true })).toHaveAttribute("aria-busy", "true");
    liberar();
    await expect(page.getByTestId("metadados-relatorio")).toContainText("01/01/2020 a 31/01/2020");
    await expect(page.getByLabel("Desde")).toBeEnabled();
  } finally { liberar(); await page.unroute("**/governanca"); }
});

test("falha ao atualizar mantém snapshot anterior e recupera após nova tentativa", async ({ page }) => {
  await abrir(page);
  const antigo = await page.getByTestId("metadados-relatorio").innerText();
  await page.route("**/governanca", (route) => route.request().method() === "POST" ? route.abort("failed") : route.continue());
  await page.getByLabel("Desde").fill("2020-01-01");
  await page.getByLabel("Até").fill("2020-01-31");
  await page.getByRole("button", { name: "Aplicar período" }).click();
  // `p` escopa a mensagem do app: no Next 16 o route-announcer (`div[role=alert]`)
  // quebra o `getByRole("alert")` puro (strict mode, 2 elementos).
  await expect(page.locator('p[role="alert"]')).toContainText("O painel anterior foi mantido");
  expect(await page.getByTestId("metadados-relatorio").innerText()).toBe(antigo);
  await expect(page.getByRole("button", { name: "Aplicar período" })).toBeEnabled();
  await page.unroute("**/governanca");
  await page.getByRole("button", { name: "Aplicar período" }).click();
  await expect(page.getByTestId("metadados-relatorio")).toContainText("01/01/2020 a 31/01/2020");
  await expect(page.locator('p[role="alert"]')).toHaveCount(0);
});

test("CSV baixado preserva metadados e os nove valores realmente exibidos", async ({ page }) => {
  await abrir(page);
  await page.getByLabel("Desde").fill("2020-01-01");
  await page.getByLabel("Até").fill("2020-01-31");
  await page.getByLabel("Janela de revisão (dias)").fill("30");
  await page.getByRole("button", { name: "Aplicar período" }).click();
  await expect(page.getByTestId("metadados-relatorio")).toContainText("30 dias");
  const geradoEm = await page.getByTestId("metadados-relatorio").locator("time").getAttribute("datetime");
  const arquivo = await baixarCsv(page);
  expect(arquivo.nome).toBe("indicadores-governanca-2020-01-01-a-2020-01-31.csv");
  expect(arquivo.conteudo.startsWith("\uFEFF")).toBe(true);
  expect(arquivo.conteudo.replaceAll("\r\n", "")).not.toContain("\n");
  const [cabecalho, ...linhas] = lerCsv(arquivo.conteudo);
  expect(cabecalho).toHaveLength(20); expect(linhas).toHaveLength(9);
  for (const linha of linhas) {
    expect(linha).toHaveLength(20);
    const registro = Object.fromEntries(cabecalho.map((coluna, i) => [coluna, linha[i]]));
    expect(registro.periodo_inicial).toBe("2020-01-01");
    expect(registro.periodo_final_inclusivo).toBe("2020-01-31");
    expect(registro.cadencia_revisao_dias).toBe("30");
    expect(registro.gerado_em_utc).toBe(geradoEm);
    expect(registro.fuso_horario).toContain("America/Fortaleza");
    const card = page.getByTestId("indicador-" + registro.indicador_id);
    const valor = !registro.valor ? "—" : registro.unidade === "%" ? registro.valor.replace(",", ".") + "%" : registro.valor.replace(",", ".") + " " + registro.unidade;
    await expect(card.getByText(valor, { exact: true })).toBeVisible();
    const status = registro.status === "SEM_DADO" ? "Sem dado" : registro.status === "ATENCAO" ? "Atenção" : "OK";
    await expect(card.getByText(status, { exact: true })).toBeVisible();
    await expect(card.getByRole("heading", { name: registro.indicador, exact: true })).toBeVisible();
  }
  expect(arquivo.conteudo).not.toContain("admin@pts.local");
});

test("falha na exportação informa erro e permite tentar o download novamente", async ({ page }) => {
  await abrir(page);
  await page.route("**/governanca", (route) => route.request().method() === "POST" ? route.abort("failed") : route.continue());
  await page.getByRole("button", { name: "Exportar CSV" }).click();
  await expect(page.locator('p[role="alert"]')).toContainText("Não foi possível exportar o CSV");
  await expect(page.getByRole("button", { name: "Exportar CSV" })).toBeEnabled();
  await page.unroute("**/governanca");
  expect((await baixarCsv(page)).conteudo).toContain("north-star");
});

test("usuário sem permissão de governança é redirecionado", async ({ page }) => {
  await entrar(page, "fisio@pts.local", "fisio123");
  await page.goto("/governanca");
  await expect(page).toHaveURL(/\/dashboard$/);
});

test("permissão apenas de dashboard mostra CER vazio com orientação e bloqueia exportação", async ({ page }) => {
  const email = `dashboard-${randomUUID()}@governance.test`;
  const senha = "dashboard-teste-123";
  try {
    const recurso = await prisma.recurso.findUniqueOrThrow({ where: { chave: "governanca.dashboard.ver" } });
    const cer = await prisma.cer.create({ data: { nome: `CER Vazio E2E ${randomUUID()}`, municipio: "Teste" } });
    const papel = await prisma.papel.create({ data: { cerId: cer.id, nome: "Consulta de governança", base: "GESTOR",
      recursos: { create: [{ recursoId: recurso.id }] } } });
    await prisma.usuario.create({ data: { cerId: cer.id, papelId: papel.id, email, senhaHash: await bcrypt.hash(senha, 10),
      nome: "Gestor dashboard teste", categoria: "ENFERMEIRO", status: "ATIVO" } });
    await entrar(page, email, senha);
    await page.goto("/governanca");
    await expect(page.getByTestId("metadados-relatorio")).toContainText(cer.nome);
    await expect(page.getByText("Nenhum dado disponível para os indicadores")).toBeVisible();
    await expect(page.getByTestId("lista-indicadores").getByText("Sem dado", { exact: true })).toHaveCount(9);
    await expect(page.getByRole("button", { name: "Exportar CSV" })).toBeDisabled();
    await expect(page.getByText(/Sua permissão permite consultar o painel/)).toBeVisible();
  } finally { await prisma.$disconnect(); }
});
