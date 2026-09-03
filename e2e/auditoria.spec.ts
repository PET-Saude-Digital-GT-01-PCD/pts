import { test, expect } from "@playwright/test";

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

test("gestor filtra a trilha de auditoria e encontra o evento gerado (#71)", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await login(page, "admin@pts.local", "admin123");

  // gera um evento de auditoria conhecido (papel.criar)
  const nomePapel = `AUD ${Date.now()}`;
  await page.goto("/dashboard/papeis");
  await page.getByLabel("Nome do papel").fill(nomePapel);
  await page.getByLabel("Base", { exact: true }).selectOption("CLINICO");
  await page.getByRole("button", { name: "Criar papel" }).click();
  await expect(page.getByRole("status")).toBeVisible();

  await page.goto("/governanca/auditoria");
  await page.getByLabel("Tipo de entidade").selectOption("papel");
  await page.getByLabel("Ação").fill("papel.criar");
  await page.getByLabel("E-mail do autor").fill("admin@pts.local");
  await page.getByRole("button", { name: "Buscar" }).click();

  const lista = page.getByTestId("lista-auditoria");
  await expect(lista).toBeVisible();
  await expect(lista.getByText("papel.criar").first()).toBeVisible();
  await expect(lista.getByText(/admin@pts\.local/).first()).toBeVisible();
});

test("sem governanca.auditoria.ver não acessa a trilha", async ({ page }) => {
  await login(page, "fisio@pts.local", "fisio123");
  await page.goto("/governanca/auditoria");
  await page.waitForURL((u) => u.pathname === "/", { timeout: 15000 });
});
