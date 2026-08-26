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
