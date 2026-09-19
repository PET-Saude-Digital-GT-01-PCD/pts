import { describe, expect, it, vi, afterAll, beforeEach } from "vitest";
import { randomUUID } from "node:crypto";

const sessao = vi.hoisted(() => ({ recursos: [] as string[] }));

vi.mock("@/server/iam/session", () => ({
  requireAuth: async () => ({ id: "u1", papelId: "p1", cerId: "c1" }),
  recursosDoUsuario: async () => sessao.recursos,
}));

import { db } from "@/lib/db";
import {
  assertPtsMutavel,
  exigirUmaDas,
  exigirUmaDasOuRedirect,
  temUmaDas,
} from "@/server/care-plan/acesso";

// Vínculo ao caso (avaliarVinculoCaso) já é coberto em tests/shared/acesso-caso.test.ts.

const CER_ID = "00000000-0000-4000-8000-000000000001";
const pacienteIds: string[] = [];
const ptsIds: string[] = [];

async function criarPts(status: "EM_AVALIACAO" | "SEGUIMENTO" | "FECHADO") {
  const paciente = await db.paciente.create({
    data: {
      cerId: CER_ID,
      nome: `Paciente Acesso ${randomUUID().slice(0, 8)}`,
      dtnasc: new Date("1990-01-01"),
      sexo: "OUTRO",
    },
  });
  pacienteIds.push(paciente.id);
  const pts = await db.pts.create({ data: { pacienteId: paciente.id, cerId: CER_ID, status } });
  ptsIds.push(pts.id);
  return pts.id;
}

beforeEach(() => {
  sessao.recursos = ["clinical.soap.ler"];
});

afterAll(async () => {
  await db.pts.deleteMany({ where: { id: { in: ptsIds } } });
  await db.paciente.deleteMany({ where: { id: { in: pacienteIds } } });
  await db.$disconnect();
});

describe("care-plan/acesso — OR de permissões", () => {
  it("temUmaDas: concede com qualquer uma das chaves e nega sem nenhuma", async () => {
    expect(await temUmaDas(["clinical.soap.ler"])).toBe(true);
    expect(await temUmaDas(["care-plan.pts.revisar", "clinical.soap.ler"])).toBe(true);
    expect(await temUmaDas(["care-plan.pts.revisar"])).toBe(false);
    expect(await temUmaDas([])).toBe(false);
  });

  it("temUmaDas compara chave inteira (prefixo não conta)", async () => {
    expect(await temUmaDas(["clinical.soap"])).toBe(false);
  });

  it("exigirUmaDas devolve o usuário quando concede e lança quando nega", async () => {
    expect(await exigirUmaDas(["clinical.soap.ler"])).toMatchObject({ id: "u1" });
    await expect(exigirUmaDas(["care-plan.pts.encerrar"])).rejects.toThrow(
      "Sem permissão para esta ação.",
    );
  });

  it("exigirUmaDasOuRedirect devolve o usuário quando concede e redireciona quando nega", async () => {
    expect(await exigirUmaDasOuRedirect(["clinical.soap.ler"])).toMatchObject({ id: "u1" });
    await expect(exigirUmaDasOuRedirect(["care-plan.pts.encerrar"])).rejects.toThrow(
      "NEXT_REDIRECT",
    );
  });
});

describe("care-plan/acesso — assertPtsMutavel (PTS FECHADO somente leitura)", () => {
  it.each(["EM_AVALIACAO", "SEGUIMENTO"] as const)("PTS %s é mutável", async (status) => {
    const ptsId = await criarPts(status);
    await expect(db.$transaction((tx) => assertPtsMutavel(ptsId, tx))).resolves.toBeUndefined();
  });

  it("PTS FECHADO lança e aborta a transação (nada gravado)", async () => {
    const ptsId = await criarPts("FECHADO");
    await expect(
      db.$transaction(async (tx) => {
        await tx.pts.update({ where: { id: ptsId }, data: { versao: { increment: 1 } } });
        await assertPtsMutavel(ptsId, tx);
      }),
    ).rejects.toThrow("PTS fechado é somente leitura; não aceita novas alterações.");
    const pts = await db.pts.findUniqueOrThrow({ where: { id: ptsId } });
    expect(pts.versao).toBe(0);
  });

  it("PTS inexistente lança", async () => {
    await expect(
      db.$transaction((tx) => assertPtsMutavel(randomUUID(), tx)),
    ).rejects.toThrow("PTS não encontrado.");
  });
});
