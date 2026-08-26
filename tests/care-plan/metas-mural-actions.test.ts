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
import {
  criarMeta,
  mudarStatusMeta,
  type Resultado as ResultadoMeta,
} from "@/server/care-plan/metas";
import { comentarMural } from "@/server/care-plan/mural";

function falhou(
  r: ResultadoMeta,
): asserts r is { ok: false; erro: string; codigo?: number } {
  expect(r.ok).toBe(false);
}

const CER_ID = "00000000-0000-4000-8000-000000000001";

let adminId: string;
let ptsId: string;
const pacienteIds: string[] = [];
const metaIds: string[] = [];

async function inputMetaValida() {
  return {
    ptsId,
    donoId: adminId,
    descTecnica: "Amplitude de ombro direito ≥ 120° em 8 semanas",
    descAcessivel: "Conseguir levantar o braço direito acima da cabeça",
    criteriosJson: { especifico: "flexão de ombro", mensuravel: "goniometria" },
    prazo: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  };
}

beforeAll(async () => {
  const admin = await db.usuario.findUniqueOrThrow({
    where: { email: "admin@pts.local" },
    select: { id: true },
  });
  adminId = admin.id;
  sessao.actorId = adminId;
  sessao.cerId = CER_ID;

  const paciente = await db.paciente.create({
    data: {
      cerId: CER_ID,
      nome: `Paciente Metas ${randomUUID().slice(0, 8)}`,
      dtnasc: new Date("1990-01-01"),
      sexo: "OUTRO",
    },
  });
  pacienteIds.push(paciente.id);
  const pts = await db.pts.create({
    data: { pacienteId: paciente.id, cerId: CER_ID },
  });
  ptsId = pts.id;
});

afterAll(async () => {
  await db.metaStatusHistorico.deleteMany({ where: { meta: { ptsId } } });
  await db.auditoria.deleteMany({
    where: {
      OR: [
        { entityType: "meta", entityId: { in: metaIds }, actorId: adminId },
        { action: "mural.comentar", actorId: adminId },
      ],
    },
  });
  await db.discussao.deleteMany({ where: { ptsId, autorId: adminId } });
  await db.meta.deleteMany({ where: { id: { in: metaIds } } });
  await db.pts.delete({ where: { id: ptsId } });
  await db.paciente.delete({ where: { id: pacienteIds[0]! } });
  await db.$disconnect();
});

describe("care-plan/metas — criarMeta", () => {
  it("sem permissão retorna erro e não cria", async () => {
    sessao.chaves = [];
    const r = await criarMeta(await inputMetaValida());
    expect(r.ok).toBe(false);
    expect(await db.meta.count({ where: { ptsId } })).toBe(0);
  });

  it("cria meta NOVA com histórico de abertura e auditoria same-tx", async () => {
    sessao.chaves = ["care-plan.meta.escrever"];
    const r = await criarMeta(await inputMetaValida());
    expect(r.ok).toBe(true);

    const meta = await db.meta.findFirstOrThrow({ where: { ptsId } });
    metaIds.push(meta.id);
    expect(meta.status).toBe("NOVA");
    expect(meta.descAcessivel).toContain("braço");

    const historico = await db.metaStatusHistorico.findMany({
      where: { metaId: meta.id },
    });
    expect(historico).toHaveLength(1);
    expect(historico[0]?.de).toBeNull();
    expect(historico[0]?.para).toBe("NOVA");
    expect(historico[0]?.autorId).toBe(adminId);

    const auditorias = await db.auditoria.findMany({
      where: { entityType: "meta", entityId: meta.id },
    });
    expect(auditorias).toHaveLength(1);
  });

  it("dupla linguagem obrigatória: sem descAcessivel rejeita", async () => {
    sessao.chaves = ["care-plan.meta.escrever"];
    const input = await inputMetaValida();
    delete (input as Record<string, unknown>).descAcessivel;
    const antes = await db.meta.count({ where: { ptsId } });
    const r = await criarMeta(input);
    expect(r.ok).toBe(false);
    expect(await db.meta.count({ where: { ptsId } })).toBe(antes);
  });

  it("meta fica presa ao PTS (FK); PTS inexistente rejeita", async () => {
    sessao.chaves = ["care-plan.meta.escrever"];
    const input = await inputMetaValida();
    const r = await criarMeta({ ...input, ptsId: randomUUID() });
    expect(r.ok).toBe(false);
  });
});

describe("care-plan/metas — mudarStatusMeta", () => {
  let metaId: string;

  beforeAll(async () => {
    sessao.chaves = ["care-plan.meta.escrever"];
    await criarMeta(await inputMetaValida());
    const meta = await db.meta.findFirstOrThrow({
      where: { ptsId },
      orderBy: { criadoEm: "desc" },
    });
    metaId = meta.id;
    if (!metaIds.includes(metaId)) metaIds.push(metaId);
  });

  it("transição válida grava histórico de/para/autor/motivo e audita", async () => {
    const r = await mudarStatusMeta({
      metaId,
      para: "EM_ANDAMENTO",
      motivo: "pactuada na reunião",
      version: 0,
    });
    expect(r.ok).toBe(true);

    const meta = await db.meta.findUniqueOrThrow({ where: { id: metaId } });
    expect(meta.status).toBe("EM_ANDAMENTO");
    expect(meta.versao).toBe(1);

    const historico = await db.metaStatusHistorico.findMany({
      where: { metaId },
      orderBy: { data: "asc" },
    });
    expect(historico).toHaveLength(2);
    const ultima = historico.at(-1);
    expect(ultima?.de).toBe("NOVA");
    expect(ultima?.para).toBe("EM_ANDAMENTO");
    expect(ultima?.autorId).toBe(adminId);
    expect(ultima?.motivo).toBe("pactuada na reunião");
  });

  it("transição inválida (NOVA → CONCLUIDA direto) rejeita", async () => {
    // volta para NOVA? Não existe retorno; usa outra meta
    await criarMeta(await inputMetaValida());
    const nova = await db.meta.findFirstOrThrow({
      where: { ptsId, status: "NOVA" },
      orderBy: { criadoEm: "desc" },
    });
    metaIds.push(nova.id);

    const r = await mudarStatusMeta({
      metaId: nova.id,
      para: "CONCLUIDA",
      version: 0,
    });
    falhou(r);
    expect(r.codigo).toBeUndefined();
    expect(
      await db.metaStatusHistorico.count({ where: { metaId: nova.id } }),
    ).toBe(1);
  });

  it("versão velha → conflito 409", async () => {
    const emAndamento = await db.meta.findFirstOrThrow({
      where: { ptsId, status: "EM_ANDAMENTO" },
    });
    const r = await mudarStatusMeta({
      metaId: emAndamento.id,
      para: "CONCLUIDA",
      version: emAndamento.versao + 5,
    });
    falhou(r);
    expect(r.codigo).toBe(409);
    const intacta = await db.meta.findUniqueOrThrow({
      where: { id: emAndamento.id },
    });
    expect(intacta.status).toBe("EM_ANDAMENTO");
  });
});

describe("care-plan/mural — comentarMural", () => {
  it("registra comentário SEM alterar versão/status do PTS nem metas", async () => {
    sessao.chaves = ["care-plan.mural.escrever"];
    const ptsAntes = await db.pts.findUniqueOrThrow({
      where: { id: ptsId },
    });
    const metasAntes = await db.meta.findMany({ where: { ptsId } });

    const r = await comentarMural({
      ptsId,
      texto: "Concordo com a meta proposta; sugerir revisão em 2 semanas.",
    });
    expect(r.ok).toBe(true);

    const comentarios = await db.discussao.findMany({ where: { ptsId } });
    expect(comentarios).toHaveLength(1);
    expect(comentarios[0]?.texto).toContain("Concordo");

    const ptsDepois = await db.pts.findUniqueOrThrow({ where: { id: ptsId } });
    expect(ptsDepois.versao).toBe(ptsAntes.versao);
    expect(ptsDepois.status).toBe(ptsAntes.status);
    expect(ptsDepois.semaforoReuniao).toBe(ptsAntes.semaforoReuniao);

    const metasDepois = await db.meta.findMany({ where: { ptsId } });
    expect(metasDepois).toEqual(metasAntes);
  });

  it("comentário vazio rejeita", async () => {
    sessao.chaves = ["care-plan.mural.escrever"];
    const r = await comentarMural({ ptsId, texto: "   " });
    expect(r.ok).toBe(false);
  });

  it("sem permissão de mural não comenta", async () => {
    sessao.chaves = ["care-plan.meta.escrever"];
    const antes = await db.discussao.count({ where: { ptsId } });
    const r = await comentarMural({ ptsId, texto: "sem permissão" });
    expect(r.ok).toBe(false);
    expect(await db.discussao.count({ where: { ptsId } })).toBe(antes);
  });
});
