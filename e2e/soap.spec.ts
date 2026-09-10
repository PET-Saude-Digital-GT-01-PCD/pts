import { test, expect } from "@playwright/test";

const PTS_ATIVO_ID = "00000000-0000-4000-8000-000000000010";

async function login(
  page: import("@playwright/test").Page,
  email: string,
  senha: string,
) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(senha);
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL((u) => u.pathname !== "/login");
}

test("médico registra avaliação SOAP e ela aparece na lista", async ({ page }) => {
  await login(page, "medico@pts.local", "medico123");
  await page.goto(`/casos/${PTS_ATIVO_ID}?aba=avaliacoes`);

  await page.getByLabel("Subjetivo").fill("Paciente relata dor lombar há 3 semanas.");
  await page.getByLabel("Objetivo").fill("ADM lombar reduzida; força MMII 5/5.");
  await page.getByLabel("Avaliacao", { exact: false }).fill("Lombalgia mecânica em investigação.");

  // grade de serviços dinâmica
  await page.getByLabel("Serviço", { exact: true }).first().fill("Fisioterapia motora");
  await page.getByLabel("Frequência").first().fill("2x/semana");
  await page.getByLabel("Duração").first().fill("8 semanas");
  await page.getByLabel("Justificativa").first().fill("Ganho de mobilidade e alívio álgico.");
  await page.getByRole("button", { name: "Adicionar serviço" }).click();
  const segundoServico = page.getByLabel("Serviço", { exact: true }).nth(1);
  await expect(segundoServico).toBeVisible();

  await page.getByRole("button", { name: "Salvar avaliação SOAP" }).click();
  await expect(page.getByTestId("soap-ok")).toBeVisible();

  const lista = page.getByTestId("lista-soap");
  await expect(lista.getByText("Lombalgia mecânica em investigação.").first()).toBeVisible();
  await expect(lista.getByText("Fisioterapia motora").first()).toBeVisible();
});

test("SOAP exige campos obrigatórios (zod na fronteira)", async ({ page }) => {
  await login(page, "medico@pts.local", "medico123");
  await page.goto(`/casos/${PTS_ATIVO_ID}?aba=avaliacoes`);
  // submete sem preencher S/O/A → HTML required bloqueia antes do servidor
  await page.getByRole("button", { name: "Salvar avaliação SOAP" }).click();
  await expect(page.getByTestId("lista-soap")).toBeVisible();
});

test("painel de divergência mostra contraste ALTA sem bloquear salvar", async ({
  page,
}) => {
  await login(page, "medico@pts.local", "medico123");
  await page.goto(`/casos/${PTS_ATIVO_ID}?aba=avaliacoes`);

  await page.getByLabel("Subjetivo").fill("Família relata boa evolução.");
  await page.getByLabel("Objetivo").fill("Exame físico com limitação importante.");
  await page.getByLabel("Avaliacao", { exact: false }).fill("Divergência clara entre relato e medida.");

  // relato otimista × medida pessimista → contradição (ALTA)
  await page.getByLabel("Mobilidade relatada pela família (0–100)").fill("90");
  await page.getByLabel("Mobilidade medida (0–100)").fill("10");
  await page.getByLabel("Autonomia relatada (0–100)").fill("80");
  await page.getByLabel("Autonomia observada (0–100)").fill("75");

  await page.getByRole("button", { name: "Salvar avaliação SOAP" }).click();
  await expect(page.getByTestId("soap-ok")).toBeVisible();

  const painel = page.getByTestId("painel-divergencia").first();
  await expect(painel).toBeVisible();
  await expect(painel.getByTestId("divergencia-alta")).toContainText("Mobilidade");
  await expect(painel.getByTestId("divergencia-baixa")).toContainText("Autonomia");
});

test("escalas Ashworth e Glasgow calculam total ao vivo e persistem em escoresJson (#66)", async ({
  page,
}) => {
  await login(page, "medico@pts.local", "medico123");
  await page.goto(`/casos/${PTS_ATIVO_ID}?aba=avaliacoes`);

  await page.getByLabel("Subjetivo").fill("Paciente sonolento, sem queixas verbais.");
  await page
    .getByLabel("Objetivo")
    .fill("Espasticidade em MMSS; rebaixamento leve do nível de consciência.");
  await page
    .getByLabel("Avaliacao", { exact: false })
    .fill("Espasticidade e rebaixamento em investigação.");

  // Ashworth: só 2 grupos avaliados → total 6, média 3.0
  await page.getByLabel("Cotovelo — flexores").selectOption("2");
  await page.getByLabel("Punho — flexores").selectOption("4");
  await expect(page.getByTestId("ashworth-total")).toContainText("Total: 6");
  await expect(page.getByTestId("ashworth-total")).toContainText("Média: 3.0");
  await expect(page.getByTestId("ashworth-total")).toContainText("2 grupo(s) avaliado(s)");

  // Glasgow: preenchimento parcial não calcula total
  await page.getByLabel("Abertura ocular (1–4)").selectOption("3");
  await expect(page.getByTestId("glasgow-total")).toContainText("preencha os 3 campos");

  await page.getByLabel("Resposta verbal (1–5)").selectOption("4");
  await page.getByLabel("Resposta motora (1–6)").selectOption("5");
  await expect(page.getByTestId("glasgow-total")).toContainText("Total: 12");

  await page.getByRole("button", { name: "Salvar avaliação SOAP" }).click();
  await expect(page.getByTestId("soap-ok")).toBeVisible();

  const lista = page.getByTestId("lista-soap");
  await expect(lista.getByText("Ashworth: total 6 (2 grupo(s))").first()).toBeVisible();
  await expect(lista.getByText("Glasgow: 12/15").first()).toBeVisible();
});
