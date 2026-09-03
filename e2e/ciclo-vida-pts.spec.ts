import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";

const db = new PrismaClient();
const CER_ID = "00000000-0000-4000-8000-000000000001";
const PTS_ATIVO_ID = "00000000-0000-4000-8000-000000000010";

const pacienteIds: string[] = [];
const ptsIds: string[] = [];

async function criarPts(
  status: "EM_AVALIACAO" | "REAVALIACAO" = "EM_AVALIACAO",
  versao = 0,
) {
  const paciente = await db.paciente.create({
    data: {
      cerId: CER_ID,
      nome: `Paciente Ciclo ${randomUUID().slice(0, 8)}`,
      dtnasc: new Date("1990-01-01"),
      sexo: "OUTRO",
    },
  });
  pacienteIds.push(paciente.id);
  const pts = await db.pts.create({
    data: { pacienteId: paciente.id, cerId: CER_ID, status, versao },
  });
  ptsIds.push(pts.id);
  return pts.id;
}

test.afterAll(async () => {
  await db.auditoria.deleteMany({ where: { entityType: "pts", entityId: { in: ptsIds } } });
  // Encerramento por contrarreferência (#62) emite guia vinculada ao PTS.
  const guias = await db.contrarreferencia.findMany({
    where: { ptsId: { in: ptsIds } },
    select: { id: true },
  });
  await db.auditoria.deleteMany({
    where: { entityType: "contrarreferencia", entityId: { in: guias.map((g) => g.id) } },
  });
  await db.contrarreferencia.deleteMany({ where: { ptsId: { in: ptsIds } } });
  await db.pts.deleteMany({ where: { id: { in: ptsIds } } });
  await db.paciente.deleteMany({ where: { id: { in: pacienteIds } } });
  await db.$disconnect();
});

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

test("referência avança status EM_AVALIACAO → PACTACAO (#59)", async ({ page }) => {
  const ptsId = await criarPts("EM_AVALIACAO", 0);
  await login(page, "referencia@pts.local", "referencia123");
  await page.goto(`/casos/${ptsId}`);

  await expect(page.getByTestId("status-pts")).toHaveText("Em avaliação");
  await page.getByRole("button", { name: "Avançar status" }).click();
  await page.getByRole("button", { name: "Confirmar" }).click();

  await expect(page.getByTestId("status-pts")).toHaveText("Pactuação", {
    timeout: 15_000,
  });
});

test("encerramento exige motivo e tipo; grava e mostra banner somente-leitura (#59)", async ({
  page,
}) => {
  const ptsId = await criarPts("REAVALIACAO", 0);
  await login(page, "referencia@pts.local", "referencia123");
  await page.goto(`/casos/${ptsId}`);

  await page.getByRole("button", { name: "Encerrar PTS" }).click();
  await page.getByLabel("Tipo de encerramento").selectOption("CONTRARREFERENCIA");
  await page.getByLabel("Motivo (obrigatório)").fill("Contrarreferência à APS.");
  await page.getByRole("button", { name: "Confirmar encerramento" }).click();

  await expect(page.getByTestId("status-pts")).toHaveText("Fechado", {
    timeout: 15_000,
  });
  await expect(page.getByTestId("banner-fechado")).toContainText(
    "Contrarreferência à APS.",
  );

  const pts = await db.pts.findUniqueOrThrow({ where: { id: ptsId } });
  expect(pts.tipoEncerramento).toBe("CONTRARREFERENCIA");
  expect(pts.encerramentoEm).not.toBeNull();
});

test("usuário sem care-plan.pts.revisar/encerrar não vê os controles de transição (#59)", async ({
  page,
}) => {
  await login(page, "fisio@pts.local", "fisio123");
  await page.goto(`/casos/${PTS_ATIVO_ID}`);
  await expect(page.getByTestId("transicao-status-pts")).toHaveCount(0);
});

test("conflito de versão ao avançar status exibe aviso para recarregar (#59)", async ({
  page,
}) => {
  const ptsId = await criarPts("EM_AVALIACAO", 0);
  await login(page, "referencia@pts.local", "referencia123");
  await page.goto(`/casos/${ptsId}`);

  await page.getByRole("button", { name: "Avançar status" }).click();

  // outra pessoa avança a versão por baixo antes da confirmação
  await db.pts.update({ where: { id: ptsId }, data: { versao: { increment: 1 } } });

  await page.getByRole("button", { name: "Confirmar" }).click();
  await expect(page.getByText(/conflito de versão/i)).toBeVisible({
    timeout: 15_000,
  });

  const intacto = await db.pts.findUniqueOrThrow({ where: { id: ptsId } });
  expect(intacto.status).toBe("EM_AVALIACAO");
});
