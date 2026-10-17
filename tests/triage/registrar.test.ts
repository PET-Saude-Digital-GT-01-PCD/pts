import { describe, expect, it, vi, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";

const sessao = vi.hoisted(() => ({
  id: "usuario-teste",
  cerId: "00000000-0000-4000-8000-000000000001",
}));

vi.mock("@/server/iam/session", () => ({
  requirePermissao: async () => ({
    id: sessao.id,
    nome: "Teste",
    email: "teste@pts.local",
    papelId: "papel-teste",
    basePapel: "CLINICO",
    nomePapel: "TESTE",
    status: "ATIVO",
    categoria: null,
    cerId: sessao.cerId,
  }),
}));

import { db } from "@/lib/db";
import { ajustarClassificacao, criarTriagem } from "@/server/triage/registrar";

const CER_ID = "00000000-0000-4000-8000-000000000001";

const eixosValidos = {
  bandeiras: {
    motivoAgudo: false,
    altaHospitalarRecente: false,
    posCirurgico: false,
  },
  funcional: [50, 50, 50, 50] as [number, number, number, number],
  social: { cuidadorPresente: true, zaritScore: 5, vulnerabilidades: 0 },
};

describe("triage/registrar — criarTriagem exige version em re-triagem (lock otimista)", () => {
  it("re-triagem (ptsId presente) sem version é rejeitada antes de tocar o banco", async () => {
    const r = await criarTriagem({
      ptsId: "00000000-0000-4000-8000-00000000ee01",
      cid: "M545",
      motivo: "Reavaliação de rotina",
      eixos: eixosValidos,
      // version omitido de propósito
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect("erro" in r ? r.erro : "").toContain("versão");
  });

  it("nascimento (pacienteId presente, sem ptsId/version) não é afetado pela regra de re-triagem", async () => {
    const r = await criarTriagem({
      pacienteId: "00000000-0000-4000-8000-00000000ee02",
      cid: "M545",
      motivo: "Triagem inicial",
      eixos: eixosValidos,
    });
    // Passa da validação de schema; falha adiante por paciente inexistente —
    // não pela ausência de version (que só se aplica a re-triagem).
    expect(r.ok).toBe(false);
    if (r.ok) return;
    const mensagem = "erro" in r ? r.erro : "";
    expect(mensagem).not.toContain("versão do PTS");
  });
});

// --- Integração (DB real): vínculo ao caso (#69) ---

const pacienteIds: string[] = [];
const ptsIds: string[] = [];
const triagemIds: string[] = [];
let adminId: string;

async function criarPts(opts: { refProfissionalId?: string | null; status?: "EM_AVALIACAO" | "FECHADO" } = {}) {
  const paciente = await db.paciente.create({
    data: {
      cerId: CER_ID,
      nome: `Paciente Triagem ${randomUUID().slice(0, 8)}`,
      dtnasc: new Date("1990-01-01"),
      sexo: "OUTRO",
    },
  });
  pacienteIds.push(paciente.id);
  const pts = await db.pts.create({
    data: {
      pacienteId: paciente.id,
      cerId: CER_ID,
      status: opts.status ?? "EM_AVALIACAO",
      refProfissionalId:
        opts.refProfissionalId === undefined ? adminId : opts.refProfissionalId,
    },
  });
  ptsIds.push(pts.id);
  return pts;
}

async function criarTriagemRow(ptsId: string) {
  const t = await db.triagem.create({
    data: {
      ptsId,
      motivo: "Triagem de teste",
      eixosJson: eixosValidos,
      pontuacaoJson: { total: 0 } as never,
      classificacao: "VERDE",
      resultadoElegibilidade: "ELEGIVEL",
    },
  });
  triagemIds.push(t.id);
  return t;
}

beforeAll(async () => {
  const admin = await db.usuario.findUniqueOrThrow({
    where: { email: "admin@pts.local" },
    select: { id: true },
  });
  adminId = admin.id;
  sessao.id = adminId;
  sessao.cerId = CER_ID;
});

afterAll(async () => {
  const ajustes = await db.ajusteClassificacao.findMany({
    where: { triagemId: { in: triagemIds } },
    select: { id: true },
  });
  await db.auditoria.deleteMany({
    where: { entityType: "ajuste_classificacao", entityId: { in: ajustes.map((a) => a.id) } },
  });
  await db.ajusteClassificacao.deleteMany({ where: { triagemId: { in: triagemIds } } });
  await db.triagem.deleteMany({ where: { id: { in: triagemIds } } });
  await db.pts.deleteMany({ where: { id: { in: ptsIds } } });
  await db.paciente.deleteMany({ where: { id: { in: pacienteIds } } });
  await db.$disconnect();
});

describe("triage/registrar — vínculo ao caso em re-triagem", () => {
  it("re-triagem de PTS sem vínculo é recusada (IDOR)", async () => {
    const pts = await criarPts({ refProfissionalId: null });
    const r = await criarTriagem({
      ptsId: pts.id,
      version: pts.versao,
      cid: "M545",
      motivo: "Reavaliação de rotina",
      justificativa: "Decisão clínica do triador.",
      eixos: eixosValidos,
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect("erro" in r ? r.erro : "").toContain("vinculado");
    expect(await db.triagem.count({ where: { ptsId: pts.id } })).toBe(0);
  });
});

describe("triage/registrar — ajustarClassificacao e vínculo", () => {
  it("ajuste de PTS sem vínculo é recusado e não grava", async () => {
    const pts = await criarPts({ refProfissionalId: null });
    const triagem = await criarTriagemRow(pts.id);

    const r = await ajustarClassificacao({
      triagemId: triagem.id,
      para: "AMARELO",
      motivo: "Reavaliação",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erro).toContain("vinculado");
    expect(await db.ajusteClassificacao.count({ where: { triagemId: triagem.id } })).toBe(0);
  });

  it("ajuste em PTS FECHADO é bloqueado (somente leitura)", async () => {
    const pts = await criarPts({ status: "FECHADO" });
    const triagem = await criarTriagemRow(pts.id);

    const r = await ajustarClassificacao({
      triagemId: triagem.id,
      para: "AMARELO",
      motivo: "Reavaliação",
    });
    expect(r.ok).toBe(false);
    expect(await db.ajusteClassificacao.count({ where: { triagemId: triagem.id } })).toBe(0);
  });

  it("ajuste com vínculo grava e audita", async () => {
    const pts = await criarPts();
    const triagem = await criarTriagemRow(pts.id);

    const r = await ajustarClassificacao({
      triagemId: triagem.id,
      para: "VERMELHO",
      motivo: "Piora clínica",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.vigente).toBe("VERMELHO");
  });
});
