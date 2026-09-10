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

test("profissional sem vínculo é redirecionado do caso; membro da equipe acessa (#69)", async ({
  page,
}) => {
  // to@pts.local tem clinical.avaliacao.ler/escrever mas nenhum vínculo ao caso
  await login(page, "to@pts.local", "to123456");
  await page.goto(`/casos/${PTS_ATIVO_ID}`);
  await page.waitForURL((u) => u.pathname === "/", { timeout: 15000 });

  // medico@pts.local está na equipe do caso (seed) sem ser a referência
  await page.context().clearCookies();
  await login(page, "medico@pts.local", "medico123");
  await page.goto(`/casos/${PTS_ATIVO_ID}`);
  await expect(page.getByTestId("status-pts")).toBeVisible();
});

test("gestor gerencia equipe do caso sem acessar conteúdo clínico (#69)", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await login(page, "gestor@pts.local", "gestor123");

  await page.goto("/dashboard/casos");
  await expect(page.getByTestId("lista-casos-equipe")).toBeVisible();
  await page.getByRole("link", { name: /Maria Exemplo/ }).click();
  await expect(page).toHaveURL(new RegExp(`/dashboard/casos/${PTS_ATIVO_ID}/equipe$`));

  // adiciona to@pts.local à equipe
  await page.getByLabel("Profissional").selectOption({
    label: "Terapeuta Ocupacional Sem Vínculo (TERAPEUTA_OCUPACIONAL)",
  });
  await page.getByLabel("Papel no caso").fill("Avaliação T.O. temporária");
  await page.getByRole("button", { name: "Adicionar" }).click();

  const linha = page.getByTestId("membro-equipe").filter({ hasText: "Terapeuta Ocupacional Sem Vínculo" });
  await expect(linha).toBeVisible();

  // remove de volta (cleanup — não deixa vínculo residual pro próximo teste)
  await linha.getByRole("button", { name: "Remover" }).click();
  await expect(linha).not.toBeVisible();

  // gestor não acessa o conteúdo clínico do caso diretamente
  await page.goto(`/casos/${PTS_ATIVO_ID}`);
  await page.waitForURL((u) => u.pathname === "/", { timeout: 15000 });
});

test("dashboard clínico lista casos por equipe, não só pela referência (#69)", async ({
  page,
}) => {
  // medico@pts.local está na equipe de PTS_ATIVO_ID (Maria), mas a
  // referência é fisio@pts.local — sem o OR na query, o card não apareceria.
  await login(page, "medico@pts.local", "medico123");
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15000 });
  await expect(
    page.getByRole("link", { name: /Maria Exemplo/ }),
  ).toBeVisible();
});
