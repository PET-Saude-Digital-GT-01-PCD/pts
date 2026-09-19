import { describe, expect, it, vi, beforeAll, afterAll, beforeEach } from "vitest";
import { randomUUID } from "node:crypto";

const sessao = vi.hoisted(() => ({
  chaves: [] as string[],
  actorId: "",
  cerId: "",
}));

vi.mock("@/server/iam/session", () => ({
  requirePermissao: async (...chaves: string[]) => {
    if (!chaves.every((c) => sessao.chaves.includes(c))) {
      const { redirect } = await import("next/navigation");
      redirect("/");
    }
    return { id: sessao.actorId, cerId: sessao.cerId };
  },
}));

import { db } from "@/lib/db";
import { IDENTIFICADORES_TESTE, MockBaselineSource } from "@/server/integrations/sources/mock";
import {
  buscarBaseline,
  importarBaseline,
  salvarBaseline,
} from "@/server/reception/baseline";

const CER_ID = "00000000-0000-4000-8000-000000000001";
const DIGITADO = {
  diagnosticos: "digitado",
  alergias: "digitado",
  medicacoes: "digitado",
  internacoes: "digitado",
} as const;

let cerOutroId: string;
const pacienteIds: string[] = [];

async function criarPaciente(cerId = CER_ID) {
  const p = await db.paciente.create({
    data: {
      cerId,
      nome: `Paciente Baseline ${randomUUID().slice(0, 8)}`,
      dtnasc: new Date("1990-01-01"),
      sexo: "OUTRO",
    },
  });
  pacienteIds.push(p.id);
  return p.id;
}

function camposDigitados() {
  return {
    diagnosticos: ["Hemiparesia"],
    alergias: [],
    medicacoes: [{ nome: "Baclofeno", dosagem: null }],
    internacoes: [],
  };
}

beforeAll(async () => {
  const admin = await db.usuario.findUniqueOrThrow({
    where: { email: "admin@pts.local" },
    select: { id: true },
  });
  sessao.actorId = admin.id;
  const outro = await db.cer.create({
    data: { nome: `CER Baseline ${randomUUID().slice(0, 8)}`, municipio: "Teste" },
  });
  cerOutroId = outro.id;
});

beforeEach(() => {
  sessao.chaves = ["recepcao.baseline.ver", "recepcao.paciente.cadastrar"];
  sessao.cerId = CER_ID;
  vi.restoreAllMocks();
});

afterAll(async () => {
  await db.auditoria.deleteMany({
    where: { entityType: "Baseline", entityId: { in: pacienteIds } },
  });
  await db.baseline.deleteMany({ where: { pacienteId: { in: pacienteIds } } });
  await db.paciente.deleteMany({ where: { id: { in: pacienteIds } } });
  await db.cer.delete({ where: { id: cerOutroId } });
  await db.$disconnect();
});

describe("reception/baseline — buscarBaseline (porta mock, ADR-0008)", () => {
  it("sem recepcao.baseline.ver recusa (redirect)", async () => {
    sessao.chaves = [];
    await expect(buscarBaseline({ identificador: IDENTIFICADORES_TESTE.COMPLETO })).rejects.toThrow();
  });

  it("identificador conhecido devolve a baseline do mock", async () => {
    const r = await buscarBaseline({ identificador: IDENTIFICADORES_TESTE.COMPLETO });
    expect(r.status).toBe("ok");
    if (r.status === "ok") expect(r.baseline.alergias).toEqual(["Dipirona"]);
  });

  it("identificador desconhecido devolve nao_encontrado", async () => {
    expect(await buscarBaseline({ identificador: "00000000000" })).toEqual({
      status: "nao_encontrado",
    });
  });

  it("fonte que lança degrada para indisponivel sem propagar", async () => {
    vi.spyOn(MockBaselineSource.prototype, "getBaseline").mockRejectedValueOnce(
      new Error("conexão recusada"),
    );
    expect(await buscarBaseline({ identificador: IDENTIFICADORES_TESTE.COMPLETO })).toEqual({
      status: "indisponivel",
    });
  });
});

describe("reception/baseline — salvarBaseline", () => {
  it("sem recepcao.paciente.cadastrar recusa e não grava", async () => {
    const pacienteId = await criarPaciente();
    sessao.chaves = ["recepcao.baseline.ver"];
    await expect(
      salvarBaseline({ pacienteId, campos: camposDigitados(), origens: DIGITADO }),
    ).rejects.toThrow();
    expect(await db.baseline.findUnique({ where: { pacienteId } })).toBeNull();
  });

  it("grava campos + origem por campo e audita; segundo save atualiza (upsert)", async () => {
    const pacienteId = await criarPaciente();
    await salvarBaseline({ pacienteId, campos: camposDigitados(), origens: DIGITADO });
    await salvarBaseline({
      pacienteId,
      campos: { ...camposDigitados(), alergias: ["Látex"] },
      origens: DIGITADO,
    });

    const b = await db.baseline.findUniqueOrThrow({ where: { pacienteId } });
    expect(b.alergiasJson).toEqual(["Látex"]);
    expect(b.origemJson).toEqual(DIGITADO);

    const aud = await db.auditoria.findMany({
      where: { entityType: "Baseline", entityId: pacienteId, action: "baseline.salva" },
    });
    expect(aud).toHaveLength(2);
  });

  it("paciente de outro CER é recusado sem gravar", async () => {
    const deFora = await criarPaciente(cerOutroId);
    await expect(
      salvarBaseline({ pacienteId: deFora, campos: camposDigitados(), origens: DIGITADO }),
    ).rejects.toThrow("Paciente fora do CER do usuário.");
    expect(await db.baseline.findUnique({ where: { pacienteId: deFora } })).toBeNull();
  });
});

describe("reception/baseline — importarBaseline", () => {
  it("importa da porta com origem 'importado' e audita", async () => {
    const pacienteId = await criarPaciente();
    const r = await importarBaseline({ pacienteId, identificador: IDENTIFICADORES_TESTE.COMPLETO });
    expect(r.status).toBe("ok");

    const b = await db.baseline.findUniqueOrThrow({ where: { pacienteId } });
    expect(b.diagnosticosJson).toEqual(["Paralisia cerebral quadriplégica", "Epilepsia"]);
    expect(b.origemJson).toMatchObject({ diagnosticos: "importado", alergias: "importado" });

    const aud = await db.auditoria.findFirstOrThrow({
      where: { entityType: "Baseline", entityId: pacienteId, action: "baseline.importada" },
    });
    expect(aud.afterJson).toMatchObject({ identificador: IDENTIFICADORES_TESTE.COMPLETO });
  });

  it("re-import não sobrescreve campo digitado com conteúdo diferente", async () => {
    const pacienteId = await criarPaciente();
    await salvarBaseline({
      pacienteId,
      campos: { ...camposDigitados(), alergias: ["Látex"] },
      origens: DIGITADO,
    });
    await importarBaseline({ pacienteId, identificador: IDENTIFICADORES_TESTE.COMPLETO });

    const b = await db.baseline.findUniqueOrThrow({ where: { pacienteId } });
    expect(b.alergiasJson).toEqual(["Látex"]);
  });

  it("nao_encontrado e indisponivel não gravam nada", async () => {
    const pacienteId = await criarPaciente();
    expect(await importarBaseline({ pacienteId, identificador: "00000000000" })).toEqual({
      status: "nao_encontrado",
    });
    vi.spyOn(MockBaselineSource.prototype, "getBaseline").mockRejectedValueOnce(new Error("x"));
    expect(
      await importarBaseline({ pacienteId, identificador: IDENTIFICADORES_TESTE.COMPLETO }),
    ).toEqual({ status: "indisponivel" });
    expect(await db.baseline.findUnique({ where: { pacienteId } })).toBeNull();
  });

  it("paciente de outro CER é recusado sem gravar", async () => {
    const deFora = await criarPaciente(cerOutroId);
    await expect(
      importarBaseline({ pacienteId: deFora, identificador: IDENTIFICADORES_TESTE.COMPLETO }),
    ).rejects.toThrow("Paciente fora do CER do usuário.");
    expect(await db.baseline.findUnique({ where: { pacienteId: deFora } })).toBeNull();
  });
});
