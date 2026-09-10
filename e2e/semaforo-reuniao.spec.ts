import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";

const db = new PrismaClient();
const CER_ID = "00000000-0000-4000-8000-000000000001";

const pacienteIds: string[] = [];
const ptsIds: string[] = [];

let referenciaId: string | undefined;

async function criarPts(status: "EM_AVALIACAO" | "FECHADO" = "EM_AVALIACAO") {
  if (!referenciaId) {
    const referencia = await db.usuario.findUniqueOrThrow({
      where: { email: "referencia@pts.local" },
      select: { id: true },
    });
    referenciaId = referencia.id;
  }
  const paciente = await db.paciente.create({
    data: {
      cerId: CER_ID,
      nome: `Paciente Semáforo ${randomUUID().slice(0, 8)}`,
      dtnasc: new Date("1990-01-01"),
      sexo: "OUTRO",
    },
  });
  pacienteIds.push(paciente.id);
  const pts = await db.pts.create({
    data: { pacienteId: paciente.id, cerId: CER_ID, status, refProfissionalId: referenciaId },
  });
  ptsIds.push(pts.id);
  return pts.id;
}

test.afterAll(async () => {
  await db.auditoria.deleteMany({
    where: { entityType: "pts", entityId: { in: ptsIds }, action: "pts.semaforo_reuniao" },
  });
  await db.eventoCuidado.deleteMany({ where: { ptsId: { in: ptsIds } } });
  await db.equipePts.deleteMany({ where: { ptsId: { in: ptsIds } } });
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

test("caso sem sinais sugere Verde; confirmar atualiza o badge (#61)", async ({
  page,
}) => {
  const ptsId = await criarPts();
  await login(page, "referencia@pts.local", "referencia123");
  await page.goto(`/casos/${ptsId}`);

  await page.getByTestId("abrir-classificar-reuniao").click();
  await expect(page.getByTestId("sugestao-semaforo")).toHaveText("Verde");

  await page.getByRole("button", { name: "Confirmar Verde" }).click();
  await expect(page.getByTestId("semaforo-reuniao-badge")).toContainText(
    "Verde",
    { timeout: 15_000 },
  );

  const pts = await db.pts.findUniqueOrThrow({ where: { id: ptsId } });
  expect(pts.semaforoReuniao).toBe("VERDE");
});

test("falta recente sugere Vermelho (evento de risco) e canal presencial (#61)", async ({
  page,
}) => {
  const ptsId = await criarPts();
  await db.eventoCuidado.create({
    data: {
      ptsId,
      tipo: "FALTA",
      data: new Date(),
      registradoPorId: (
        await db.usuario.findUniqueOrThrow({ where: { email: "admin@pts.local" } })
      ).id,
    },
  });

  await login(page, "referencia@pts.local", "referencia123");
  await page.goto(`/casos/${ptsId}`);

  await page.getByTestId("abrir-classificar-reuniao").click();
  await expect(page.getByTestId("sugestao-semaforo")).toHaveText("Vermelho");
  await expect(page.getByText("Reunião presencial")).toBeVisible();
  await expect(page.getByText("Falta registrada nos últimos 30 dias.")).toBeVisible();

  await page.getByRole("button", { name: "Confirmar Vermelho" }).click();
  await expect(page.getByTestId("semaforo-reuniao-badge")).toContainText(
    "Vermelho",
    { timeout: 15_000 },
  );
});

test("usuário sem care-plan.pts.revisar não vê o botão de classificar reunião (#61)", async ({
  page,
}) => {
  const ptsId = await criarPts();
  const fisio = await db.usuario.findUniqueOrThrow({
    where: { email: "fisio@pts.local" },
    select: { id: true },
  });
  // vínculo ao caso (#69) sem ser referência: entra na equipe para a
  // asserção testar a ausência do botão por PERMISSÃO, não por redirect.
  await db.equipePts.create({
    data: { ptsId, usuarioId: fisio.id, papelNoCaso: "Fisioterapeuta" },
  });
  await login(page, "fisio@pts.local", "fisio123");
  await page.goto(`/casos/${ptsId}`);
  await expect(page.getByTestId("abrir-classificar-reuniao")).toHaveCount(0);
});

test("PTS FECHADO não exibe o botão de classificar reunião (#61)", async ({
  page,
}) => {
  const ptsId = await criarPts("FECHADO");
  await login(page, "referencia@pts.local", "referencia123");
  await page.goto(`/casos/${ptsId}`);
  await expect(page.getByTestId("abrir-classificar-reuniao")).toHaveCount(0);
});
