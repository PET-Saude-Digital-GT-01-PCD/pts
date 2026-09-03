import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";

const db = new PrismaClient();
const CER_ID = "00000000-0000-4000-8000-000000000001";

const pacienteIds: string[] = [];
const ptsIds: string[] = [];

let fisioId: string | undefined;

async function criarPts(status: "EM_AVALIACAO" | "FECHADO" = "EM_AVALIACAO") {
  if (!fisioId) {
    const fisio = await db.usuario.findUniqueOrThrow({
      where: { email: "fisio@pts.local" },
      select: { id: true },
    });
    fisioId = fisio.id;
  }
  const paciente = await db.paciente.create({
    data: {
      cerId: CER_ID,
      nome: `Paciente Evento ${randomUUID().slice(0, 8)}`,
      dtnasc: new Date("1990-01-01"),
      sexo: "OUTRO",
    },
  });
  pacienteIds.push(paciente.id);
  const pts = await db.pts.create({
    data: { pacienteId: paciente.id, cerId: CER_ID, status, refProfissionalId: fisioId },
  });
  ptsIds.push(pts.id);
  return pts.id;
}

test.afterAll(async () => {
  const eventos = await db.eventoCuidado.findMany({
    where: { ptsId: { in: ptsIds } },
    select: { id: true },
  });
  await db.auditoria.deleteMany({
    where: { entityType: "evento_cuidado", entityId: { in: eventos.map((e) => e.id) } },
  });
  await db.eventoCuidado.deleteMany({ where: { ptsId: { in: ptsIds } } });
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

test("registra evento de cuidado em poucos cliques e aparece na timeline (#60)", async ({
  page,
}) => {
  const ptsId = await criarPts();
  await login(page, "fisio@pts.local", "fisio123");
  await page.goto(`/casos/${ptsId}`);

  // clique 1: abre o form
  await page.getByTestId("abrir-form-evento").click();
  await page.getByLabel("Tipo").selectOption("SESSAO");
  await page.getByLabel("Observação (opcional)").fill("Sessão de fisioterapia motora.");
  // clique 2: salva
  await page.getByRole("button", { name: "Salvar evento" }).click();

  await expect(page.getByText("Evento de cuidado (SESSAO)")).toBeVisible({
    timeout: 15_000,
  });

  const evento = await db.eventoCuidado.findFirstOrThrow({ where: { ptsId } });
  expect(evento.tipo).toBe("SESSAO");
  expect(evento.observacao).toContain("fisioterapia");
});

test("evento FALTA dispara o alerta do painel (#60)", async ({ page }) => {
  const ptsId = await criarPts();
  await login(page, "fisio@pts.local", "fisio123");
  await page.goto(`/casos/${ptsId}`);

  await expect(page.getByTestId("alerta-falta")).toHaveCount(0);

  await page.getByTestId("abrir-form-evento").click();
  await page.getByLabel("Tipo").selectOption("FALTA");
  await page.getByRole("button", { name: "Salvar evento" }).click();

  await expect(page.getByTestId("alerta-falta")).toBeVisible({ timeout: 15_000 });
});

test("PTS FECHADO não exibe o botão de registrar evento (#60)", async ({ page }) => {
  const ptsId = await criarPts("FECHADO");
  await login(page, "fisio@pts.local", "fisio123");
  await page.goto(`/casos/${ptsId}`);

  await expect(page.getByTestId("abrir-form-evento")).toHaveCount(0);
});
