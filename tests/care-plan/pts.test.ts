import { describe, expect, it, vi, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";

// Sessão mockada: usecases dependem do usuário logado; o resto é DB real.
const sessao = vi.hoisted(() => ({
  chaves: [] as string[],
  actorId: "",
  cerId: "",
}));

vi.mock("@/server/iam/session", () => ({
  requireAuth: async () => ({
    id: sessao.actorId,
    nome: "Teste",
    email: "teste@pts.local",
    papelId: "papel-teste",
    basePapel: "CLINICO",
    nomePapel: "TESTE",
    status: "ATIVO",
    categoria: null,
    cerId: sessao.cerId,
  }),
  recursosDoUsuario: async () => sessao.chaves,
}));

import { db } from "@/lib/db";
import { abrirPts, transicionarStatusPts } from "@/server/care-plan/pts";

const CER_ID = "00000000-0000-4000-8000-000000000001";

let adminId: string;
const pacienteIds: string[] = [];
const ptsIds: string[] = [];

async function criarPaciente() {
  const p = await db.paciente.create({
    data: {
      cerId: CER_ID,
      nome: `Paciente Teste ${randomUUID().slice(0, 8)}`,
      dtnasc: new Date("1990-01-01"),
      sexo: "OUTRO",
    },
  });
  pacienteIds.push(p.id);
  return p.id;
}

beforeAll(async () => {
  const admin = await db.usuario.findUniqueOrThrow({
    where: { email: "admin@pts.local" },
    select: { id: true },
  });
  adminId = admin.id;
  sessao.actorId = adminId;
  sessao.cerId = CER_ID;
});

afterAll(async () => {
  await db.auditoria.deleteMany({
    where: { entityType: "pts", entityId: { in: ptsIds }, actorId: adminId },
  });
  await db.pts.deleteMany({ where: { id: { in: ptsIds } } });
  await db.paciente.deleteMany({ where: { id: { in: pacienteIds } } });
  await db.$disconnect();
});

describe("care-plan/pts — abrirPts", () => {
  it("cria PTS EM_AVALIACAO com versao 0 e auditoria na mesma transação", async () => {
    sessao.chaves = ["recepcao.paciente.cadastrar"];
    const pacienteId = await criarPaciente();

    const r = await abrirPts({ pacienteId });
    expect(r.ok).toBe(true);
    if (!r.ok) return;

    ptsIds.push(r.ptsId);
    const pts = await db.pts.findUniqueOrThrow({ where: { id: r.ptsId } });
    expect(pts.status).toBe("EM_AVALIACAO");
    expect(pts.versao).toBe(0);
    expect(pts.cerId).toBe(CER_ID);

    // Auditoria same-tx: se a transação rollbackasse, aqui não haveria registro.
    const aud = await db.auditoria.findFirstOrThrow({
      where: { entityType: "pts", entityId: r.ptsId, action: "pts.abrir" },
    });
    expect(aud.actorId).toBe(adminId);
    expect(aud.afterJson).toMatchObject({ status: "EM_AVALIACAO" });
  });

  it("recusa segundo PTS ativo para o mesmo paciente", async () => {
    sessao.chaves = ["triage.triagem.escrever"];
    const pacienteId = await criarPaciente();

    const primeiro = await abrirPts({ pacienteId });
    expect(primeiro.ok).toBe(true);
    if (primeiro.ok) ptsIds.push(primeiro.ptsId);

    const duplicado = await abrirPts({ pacienteId });
    expect(duplicado.ok).toBe(false);
    if (duplicado.ok) return;
    expect(duplicado.erro).toContain("PTS ativo");
  });

  it("recusa sem permissão de abertura (nem recepcao nem triagem)", async () => {
    sessao.chaves = ["clinical.soap.ler"];
    const pacienteId = await criarPaciente();
    await expect(abrirPts({ pacienteId })).rejects.toThrow(/permiss/i);
  });
});

describe("care-plan/pts — transicionarStatusPts", () => {
  async function ptsEm(status: "EM_AVALIACAO" | "REAVALIACAO", versao: number) {
    const pacienteId = await criarPaciente();
    const pts = await db.pts.create({
      data: { pacienteId, cerId: CER_ID, status, versao },
    });
    ptsIds.push(pts.id);
    return pts;
  }

  it("transição válida atualiza status, versão e grava before/after", async () => {
    sessao.chaves = ["care-plan.pts.revisar"];
    const pts = await ptsEm("REAVALIACAO", 3);

    const r = await transicionarStatusPts({
      ptsId: pts.id,
      para: "EM_AVALIACAO",
      version: 3,
    });
    expect(r.ok).toBe(true);

    const depois = await db.pts.findUniqueOrThrow({ where: { id: pts.id } });
    expect(depois.status).toBe("EM_AVALIACAO");
    expect(depois.versao).toBe(4);

    const aud = await db.auditoria.findFirstOrThrow({
      where: { entityType: "pts", entityId: pts.id, action: "pts.transicionar" },
    });
    expect(aud.beforeJson).toMatchObject({ status: "REAVALIACAO", versao: 3 });
    expect(aud.afterJson).toMatchObject({ status: "EM_AVALIACAO", versao: 4 });
  });

  it("recusa transição inválida listando as válidas", async () => {
    sessao.chaves = ["care-plan.pts.revisar"];
    const pts = await ptsEm("EM_AVALIACAO", 0);

    const r = await transicionarStatusPts({
      ptsId: pts.id,
      para: "SEGUIMENTO",
      version: 0,
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.erro).toContain("PACTACAO");

    const inalterado = await db.pts.findUniqueOrThrow({ where: { id: pts.id } });
    expect(inalterado.status).toBe("EM_AVALIACAO");
  });

  it("recusa FECHADO sem motivoEncerramento", async () => {
    sessao.chaves = ["care-plan.pts.encerrar"];
    const pts = await ptsEm("REAVALIACAO", 1);

    const r = await transicionarStatusPts({
      ptsId: pts.id,
      para: "FECHADO",
      tipoEncerramento: "ALTA",
      version: 1,
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.erro).toContain("motivo");
  });

  it("recusa FECHADO sem tipoEncerramento", async () => {
    sessao.chaves = ["care-plan.pts.encerrar"];
    const pts = await ptsEm("REAVALIACAO", 1);

    const r = await transicionarStatusPts({
      ptsId: pts.id,
      para: "FECHADO",
      motivo: "Alta funcional.",
      version: 1,
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.erro).toContain("tipo");

    const inalterado = await db.pts.findUniqueOrThrow({ where: { id: pts.id } });
    expect(inalterado.status).toBe("REAVALIACAO");
  });

  it("FECHADO com motivo e tipo grava motivoEncerramento + tipoEncerramento + encerramentoEm", async () => {
    sessao.chaves = ["care-plan.pts.encerrar"];
    const pts = await ptsEm("REAVALIACAO", 1);

    const r = await transicionarStatusPts({
      ptsId: pts.id,
      para: "FECHADO",
      motivo: "Alta funcional.",
      tipoEncerramento: "ALTA",
      version: 1,
    });
    expect(r.ok).toBe(true);

    const fechado = await db.pts.findUniqueOrThrow({ where: { id: pts.id } });
    expect(fechado.status).toBe("FECHADO");
    expect(fechado.motivoEncerramento).toBe("Alta funcional.");
    expect(fechado.tipoEncerramento).toBe("ALTA");
    expect(fechado.encerramentoEm).not.toBeNull();
  });

  it("versão velha retorna conflito 409 e não altera nada", async () => {
    sessao.chaves = ["care-plan.pts.revisar"];
    const pts = await ptsEm("EM_AVALIACAO", 5);

    const r = await transicionarStatusPts({
      ptsId: pts.id,
      para: "PACTACAO",
      version: 2,
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.codigo).toBe(409);

    const intacto = await db.pts.findUniqueOrThrow({ where: { id: pts.id } });
    expect(intacto.status).toBe("EM_AVALIACAO");
    expect(intacto.versao).toBe(5);
  });

  it("encerrar exige care-plan.pts.encerrar (só revisar não basta)", async () => {
    sessao.chaves = ["care-plan.pts.revisar"];
    const pts = await ptsEm("REAVALIACAO", 0);

    await expect(
      transicionarStatusPts({
        ptsId: pts.id,
        para: "FECHADO",
        motivo: "x",
        version: 0,
      }),
    ).rejects.toThrow(/permiss/i);
  });
});
