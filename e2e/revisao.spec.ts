import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
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

test.afterEach(async () => {
  // limpa marcos criados nesta suíte pra não acumular entre execuções
  await db.auditoria.deleteMany({
    where: { entityType: "pts_revisao" },
  });
  await db.ptsRevisao.deleteMany({ where: { ptsId: PTS_ATIVO_ID } });
  await db.pts.update({
    where: { id: PTS_ATIVO_ID },
    data: { status: "EM_AVALIACAO" },
  });
});

test("registra dois marcos de revisão; comparativo mostra o que mudou entre eles (#70)", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await login(page, "referencia@pts.local", "referencia123");
  await page.goto(`/casos/${PTS_ATIVO_ID}?aba=revisoes`);

  await page.getByLabel("Motivo da revisão").fill("Marco inicial de acompanhamento");
  await page.getByRole("button", { name: "Registrar revisão" }).click();
  await expect(page.getByTestId("revisao-ok")).toContainText("Revisão #");

  // muda algo na trilha (meta) entre os dois marcos
  const meta = await db.meta.findFirstOrThrow({
    where: { ptsId: PTS_ATIVO_ID },
    select: { id: true },
  });
  const donoId = (
    await db.usuario.findUniqueOrThrow({
      where: { email: "referencia@pts.local" },
      select: { id: true },
    })
  ).id;
  await db.metaStatusHistorico.create({
    data: { metaId: meta.id, de: "NOVA", para: "EM_ANDAMENTO", autorId: donoId },
  });

  await page.getByLabel("Motivo da revisão").fill("Segundo marco após ajuste de metas");
  await page.getByRole("button", { name: "Registrar revisão" }).click();
  await expect(page.getByTestId("lista-revisoes")).toContainText("Revisão #2");

  await page.getByLabel("De").selectOption({ label: "Revisão #1" });
  await page.getByLabel("Até").selectOption({ label: "Revisão #2" });
  await page.getByRole("button", { name: "Comparar" }).click();

  const resultado = page.getByTestId("resultado-comparativo");
  await expect(resultado).toBeVisible();
  await expect(resultado.getByText("Em andamento")).toBeVisible();
});

test("PTS em reavaliação sugere registrar revisão", async ({ page }) => {
  await db.pts.update({
    where: { id: PTS_ATIVO_ID },
    data: { status: "REAVALIACAO" },
  });

  await login(page, "referencia@pts.local", "referencia123");
  await page.goto(`/casos/${PTS_ATIVO_ID}`);
  await expect(page.getByTestId("banner-sugestao-revisao")).toBeVisible();
});
