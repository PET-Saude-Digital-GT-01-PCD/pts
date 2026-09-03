import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";

import { db } from "@/lib/db";
import { queryCasosPorPapel } from "@/server/care-plan/dashboard";

// CERs isolados (não o CER_ID compartilhado pelo resto da suíte) para que a
// contagem de agregados não sofra corrida com outros arquivos de teste.
let cerAId: string;
let cerBId: string;

const pacienteIds: string[] = [];
const ptsIds: string[] = [];

async function ptsNoCer(cerId: string, status: "EM_AVALIACAO" | "FECHADO" = "EM_AVALIACAO") {
  const paciente = await db.paciente.create({
    data: {
      cerId,
      nome: `Pac Dash ${randomUUID().slice(0, 8)}`,
      dtnasc: new Date("1990-01-01"),
      sexo: "OUTRO",
    },
  });
  pacienteIds.push(paciente.id);
  const pts = await db.pts.create({ data: { pacienteId: paciente.id, cerId, status } });
  ptsIds.push(pts.id);
  return pts;
}

beforeAll(async () => {
  const [cerA, cerB] = await Promise.all([
    db.cer.create({
      data: { nome: `CER Teste A ${randomUUID().slice(0, 8)}`, municipio: "Teste" },
    }),
    db.cer.create({
      data: { nome: `CER Teste B ${randomUUID().slice(0, 8)}`, municipio: "Teste" },
    }),
  ]);
  cerAId = cerA.id;
  cerBId = cerB.id;

  await ptsNoCer(cerAId);
  await ptsNoCer(cerAId, "FECHADO");
  await ptsNoCer(cerBId);
  await ptsNoCer(cerBId);
  await ptsNoCer(cerBId);
});

afterAll(async () => {
  await db.pts.deleteMany({ where: { id: { in: ptsIds } } });
  await db.paciente.deleteMany({ where: { id: { in: pacienteIds } } });
  await db.cer.deleteMany({ where: { id: { in: [cerAId, cerBId] } } });
  await db.$disconnect();
});

describe("care-plan/dashboard — queryCasosPorPapel (visão GESTAO)", () => {
  it("gestor do CER A vê só os agregados do seu CER, não do CER B", async () => {
    const visao = await queryCasosPorPapel(
      { id: "gestor-a", cerId: cerAId },
      ["governanca.dashboard.ver"],
    );
    expect(visao?.visao).toBe("GESTAO");
    if (visao?.visao !== "GESTAO") return;

    expect(visao.agregados.total).toBe(2);
  });

  it("gestor do CER B vê só os agregados do seu CER", async () => {
    const visao = await queryCasosPorPapel(
      { id: "gestor-b", cerId: cerBId },
      ["governanca.dashboard.ver"],
    );
    expect(visao?.visao).toBe("GESTAO");
    if (visao?.visao !== "GESTAO") return;

    expect(visao.agregados.total).toBe(3);
  });
});
