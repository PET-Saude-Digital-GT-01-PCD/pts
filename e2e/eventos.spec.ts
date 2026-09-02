import { test, expect } from "@playwright/test";

const PTS_ATIVO_ID = "00000000-0000-4000-8000-000000000010";

async function login(page: import("@playwright/test").Page, email: string, senha: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(senha);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL((u) => u.pathname !== "/login");
}

test.describe("Eventos no PTS", () => {
  test("registrar evento (SESSAO) e ver na timeline", async ({ page }) => {
    test.setTimeout(30_000);
    await login(page, "fisio@pts.local", "fisio123");
    await page.goto(`/casos/${PTS_ATIVO_ID}`);

    // Abrir o form de registrar evento
    await page.getByRole("button", { name: /Registrar evento/i }).click();

    // Preencher o formulário
    await page.getByLabel("Tipo de evento").selectOption("SESSAO");
    await page.getByLabel("Observação (opcional)").fill("Sessão de reabilitação inicial.");
    
    // Submeter o formulário
    await page.getByRole("button", { name: "Salvar", exact: true }).click();

    // Esperar o evento aparecer na timeline
    await expect(page.getByText("Sessão de reabilitação inicial.").first()).toBeVisible();
    await expect(page.getByText("Evento de cuidado (SESSAO)").first()).toBeVisible();
  });

  test("registrar FALTA destaca alerta ao referência", async ({ page }) => {
    test.setTimeout(30_000);
    await login(page, "fisio@pts.local", "fisio123");
    await page.goto(`/casos/${PTS_ATIVO_ID}`);

    // Abrir o form de registrar evento
    await page.getByRole("button", { name: /Registrar evento/i }).click();

    // Preencher o formulário de FALTA
    await page.getByLabel("Tipo de evento").selectOption("FALTA");
    await page.getByLabel("Observação (opcional)").fill("Paciente não compareceu ao ônibus.");
    
    // Submeter o formulário
    await page.getByRole("button", { name: "Salvar", exact: true }).click();

    // Ver na timeline
    await expect(page.getByText("Paciente não compareceu ao ônibus.").first()).toBeVisible();
    await expect(page.getByText("Evento de cuidado (FALTA)").first()).toBeVisible();

    // O alerta de FALTA DEVE aparecer
    await expect(page.getByTestId("alerta-falta")).toBeVisible();
  });
});
