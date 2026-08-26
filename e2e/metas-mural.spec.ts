import { test, expect } from "@playwright/test";

const PTS_ATIVO_ID = "00000000-0000-4000-8000-000000000010";

// O spec de papéis pode ter deixado o fisio como MEDICO (troca persiste no
// banco dev); restaura FISIOTERAPEUTA para termos meta.escrever/mural.escrever.
async function restaurarPapelFisio(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("admin@pts.local");
  await page.getByLabel("Senha").fill("admin123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL((u) => u.pathname !== "/login");

  await page.goto("/dashboard/usuarios");
  const linha = page.locator('[data-email="fisio@pts.local"]');
  const select = linha.locator("select");
  const papelFisio = await select
    .locator("option")
    .filter({ hasText: "FISIOTERAPEUTA" })
    .getAttribute("value");
  if (papelFisio && (await select.inputValue()) !== papelFisio) {
    await select.selectOption(papelFisio);
    await linha.getByRole("button", { name: "Salvar" }).click();
    await expect(linha.getByText("salvo")).toBeVisible();
  }
  await page.context().clearCookies();
}

async function login(page: import("@playwright/test").Page) {
  await restaurarPapelFisio(page);
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("fisio@pts.local");
  await page.getByLabel("Senha").fill("fisio123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL((u) => u.pathname !== "/login");
}

test("cria meta com dupla linguagem na aba Metas (#6)", async ({ page }) => {
  await login(page);
  await page.goto(`/casos/${PTS_ATIVO_ID}?aba=metas`);

  const descTecnica = `Meta e2e ${Date.now()}: caminhar 200m sem apoio`;
  await page.getByRole("button", { name: "Nova meta" }).click();

  await page.getByLabel("Descrição técnica").fill(descTecnica);
  await page
    .getByLabel("Descrição acessível (para o paciente)")
    .fill("Conseguir caminhar até a padaria sozinho");
  const futuro = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  await page.getByLabel("Prazo").fill(futuro);

  await page.getByRole("button", { name: "Salvar meta" }).click();
  const abaMetas = page.getByTestId("aba-metas");
  const itemNovo = abaMetas.locator("li", { hasText: descTecnica });
  await expect(itemNovo).toBeVisible();
  await expect(itemNovo.getByText("Nova")).toBeVisible();
});

test("meta vencida do seed aparece destacada com dupla linguagem", async ({
  page,
}) => {
  await login(page);
  await page.goto(`/casos/${PTS_ATIVO_ID}?aba=metas`);

  const item = page
    .getByTestId("aba-metas")
    .locator("li", { hasText: "Amplitude de movimento de ombro" });
  await expect(item).toBeVisible();
  await expect(item.getByText("prazo vencido")).toBeVisible();
  await expect(
    item.getByText("Conseguir levantar o braço direito acima da cabeça")
  ).toBeVisible();
});

test("transição de status NOVA → EM_ANDAMENTO registra mudança", async ({
  page,
}) => {
  await login(page);
  await page.goto(`/casos/${PTS_ATIVO_ID}?aba=metas`);

  // cria meta própria para não depender do estado de runs anteriores
  const descTecnica = `Transição e2e ${Date.now()}: subir escada com apoio único`;
  await page.getByRole("button", { name: "Nova meta" }).click();
  await page.getByLabel("Descrição técnica").fill(descTecnica);
  await page
    .getByLabel("Descrição acessível (para o paciente)")
    .fill("Conseguir subir a escada de casa sem ajuda");
  const futuro = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  await page.getByLabel("Prazo").fill(futuro);
  await page.getByRole("button", { name: "Salvar meta" }).click();

  const item = page
    .getByTestId("aba-metas")
    .locator("li", { hasText: descTecnica });
  await expect(item).toBeVisible();
  await item.getByLabel("Novo status").selectOption("EM_ANDAMENTO");
  await item.getByLabel("Motivo da mudança de status").fill("pactuada");
  await item.getByRole("button", { name: "Mudar status" }).click();

  await expect(item.locator("span", { hasText: "Em andamento" })).toBeVisible();
});

test("comenta no mural e comentário aparece na timeline (#6)", async ({
  page,
}) => {
  await login(page);
  await page.goto(`/casos/${PTS_ATIVO_ID}?aba=mural`);

  const texto = `Comentário e2e ${Date.now()}: concordar com ajuste da meta.`;
  await page
    .getByTestId("form-mural")
    .getByPlaceholder(/Comente no mural/)
    .fill(texto);
  await page.getByRole("button", { name: "Comentar" }).click();

  await expect(page.locator("ol li", { hasText: texto })).toBeVisible();
});
