import { describe, expect, it, vi, beforeAll, beforeEach, afterAll } from "vitest";
import { randomUUID } from "node:crypto";

const sessao = vi.hoisted(() => ({
  chaves: [] as string[],
  actorId: "",
}));

vi.mock("@/server/iam/session", () => ({
  requirePermissao: async () => {
    if (!sessao.chaves.includes("portal.cidadao.acesso")) {
      throw new Error("Sem permissão para esta ação.");
    }
    return {
      id: sessao.actorId,
      nome: "Teste",
      email: "teste@pts.local",
      papelId: "papel-teste",
      basePapel: "CLINICO",
      nomePapel: "TESTE",
      status: "ATIVO",
      categoria: null,
      cerId: "00000000-0000-4000-8000-000000000001",
    };
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { db } from "@/lib/db";
import {
  buscarAcessoCidadaoDoPts,
  gerarLinkCidadao,
  revogarLinkCidadao,
} from "@/server/care-plan/acesso-cidadao";
import { hashCodigo } from "@/server/care-plan/portal-cidadao";
import { buscarPortalPorCodigo } from "@/server/care-plan/portal-cidadao-leitura";

const CER_ID = "00000000-0000-4000-8000-000000000001";

let adminId: string;
const pacienteIds: string[] = [];
const ptsIds: string[] = [];
const acessoIds: string[] = [];
const cerIds: string[] = [];

beforeAll(async () => {
  const admin = await db.usuario.findUniqueOrThrow({
    where: { email: "admin@pts.local" },
    select: { id: true },
  });
  adminId = admin.id;
  sessao.actorId = adminId;
});

beforeEach(() => {
  sessao.chaves = ["portal.cidadao.acesso"];
});

afterAll(async () => {
  const acessos = await db.acessoCidadao.findMany({
    where: { ptsId: { in: ptsIds } },
    select: { id: true },
  });
  const ids = acessos.map((a) => a.id);
  await db.acessoCidadaoLog.deleteMany({ where: { acessoCidadaoId: { in: ids } } });
  await db.acessoCidadao.deleteMany({ where: { ptsId: { in: ptsIds } } });
  await db.auditoria.deleteMany({
    where: { entityType: "acesso_cidadao", entityId: { in: ids } },
  });
  await db.meta.deleteMany({ where: { ptsId: { in: ptsIds } } });
  await db.pts.deleteMany({ where: { id: { in: ptsIds } } });
  await db.paciente.deleteMany({ where: { id: { in: pacienteIds } } });
  await db.cer.deleteMany({ where: { id: { in: cerIds } } });
  await db.$disconnect();
});

async function ptsComNome(nome: string) {
  const paciente = await db.paciente.create({
    data: {
      cerId: CER_ID,
      nome,
      dtnasc: new Date("1990-01-01"),
      sexo: "OUTRO",
    },
  });
  pacienteIds.push(paciente.id);
  const pts = await db.pts.create({
    data: { pacienteId: paciente.id, cerId: CER_ID, refProfissionalId: adminId },
  });
  ptsIds.push(pts.id);
  return pts;
}

function codigoDoLink(link: string): string {
  return link.split("/").pop() as string;
}

describe("gerarLinkCidadao", () => {
  it("gera link com código e grava auditoria na mesma transação", async () => {
    const pts = await ptsComNome(`Pac Link ${randomUUID().slice(0, 8)}`);

    const resultado = await gerarLinkCidadao({ ptsId: pts.id });

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    const codigo = codigoDoLink(resultado.link);
    expect(codigo).toMatch(/^[0-9A-HJKMNP-TV-Z]{5}-[0-9A-HJKMNP-TV-Z]{5}$/);
    expect(resultado.expiraEm.getTime()).toBeGreaterThan(Date.now());

    const acesso = await db.acessoCidadao.findFirstOrThrow({
      where: { ptsId: pts.id, revogadoEm: null },
    });
    acessoIds.push(acesso.id);
    // só o hash é persistido
    expect(acesso.codigoHash).toBe(hashCodigo(codigo));
    expect(acesso.criadoPorId).toBe(adminId);
    expect(acesso.totalAcessos).toBe(0);

    const auditoria = await db.auditoria.findFirstOrThrow({
      where: { entityType: "acesso_cidadao", entityId: acesso.id },
    });
    expect(auditoria.action).toBe("acesso_cidadao.gerar");
    expect(auditoria.actorId).toBe(adminId);
  });

  it("gerar novo link revoga o anterior e mantém só um ativo", async () => {
    const pts = await ptsComNome(`Pac Regenera ${randomUUID().slice(0, 8)}`);

    const primeiro = await gerarLinkCidadao({ ptsId: pts.id });
    const segundo = await gerarLinkCidadao({ ptsId: pts.id });
    expect(primeiro.ok && segundo.ok).toBe(true);
    if (!primeiro.ok || !segundo.ok) return;

    const ativos = await db.acessoCidadao.findMany({
      where: { ptsId: pts.id, revogadoEm: null },
    });
    expect(ativos).toHaveLength(1);
    acessoIds.push(ativos[0].id);

    const antigos = await db.acessoCidadao.findMany({
      where: { ptsId: pts.id, revogadoEm: { not: null } },
    });
    expect(antigos).toHaveLength(1);

    // o link antigo não abre mais, o novo abre
    const viaAntigo = await buscarPortalPorCodigo(codigoDoLink(primeiro.link));
    expect(viaAntigo.estado).toBe("REVOGADO");
    const viaNovo = await buscarPortalPorCodigo(codigoDoLink(segundo.link));
    expect(viaNovo.estado).toBe("ATIVO");
  });

  it("recusa PTS de outro CER", async () => {
    const outroCer = await db.cer.create({
      data: {
        nome: `CER_isolado_${randomUUID().slice(0, 6)}`,
        municipio: "Municipio Teste",
      },
    });
    cerIds.push(outroCer.id);
    const paciente = await db.paciente.create({
      data: {
        cerId: outroCer.id,
        nome: `Pac Isolado ${randomUUID().slice(0, 8)}`,
        dtnasc: new Date("1990-01-01"),
        sexo: "OUTRO",
      },
    });
    const pts = await db.pts.create({
      data: { pacienteId: paciente.id, cerId: outroCer.id },
    });
    ptsIds.push(pts.id);
    pacienteIds.push(paciente.id);

    const resultado = await gerarLinkCidadao({ ptsId: pts.id });
    expect(resultado).toEqual({ ok: false, erro: "Caso não encontrado." });
  });

  it("recusa input inválido", async () => {
    const resultado = await gerarLinkCidadao({ ptsId: "nao-e-uuid" });
    expect(resultado).toEqual({ ok: false, erro: "Caso inválido." });
  });
});

describe("revogarLinkCidadao", () => {
  it("revoga o link e audita", async () => {
    const pts = await ptsComNome(`Pac Revoga ${randomUUID().slice(0, 8)}`);
    const emitido = await gerarLinkCidadao({ ptsId: pts.id });
    if (!emitido.ok) throw new Error("esperava emissão ok");

    const acesso = await db.acessoCidadao.findFirstOrThrow({
      where: { ptsId: pts.id },
    });
    acessoIds.push(acesso.id);

    expect(await revogarLinkCidadao({ acessoId: acesso.id })).toEqual({ ok: true });

    const revogado = await db.acessoCidadao.findUniqueOrThrow({
      where: { id: acesso.id },
    });
    expect(revogado.revogadoEm).not.toBeNull();

    const auditoria = await db.auditoria.findFirstOrThrow({
      where: { entityType: "acesso_cidadao", entityId: acesso.id, action: "acesso_cidadao.revogar" },
    });
    expect(auditoria.beforeJson).toMatchObject({ ptsId: pts.id, ativo: true });

    const leitura = await buscarPortalPorCodigo(codigoDoLink(emitido.link));
    expect(leitura.estado).toBe("REVOGADO");
  });
});

describe("buscarPortalPorCodigo", () => {
  it("devolve a visão mínima e registra o momento do acesso", async () => {
    const nome = `Portal Cidadao ${randomUUID().slice(0, 8)}`;
    const pts = await ptsComNome(nome);
    await db.meta.create({
      data: {
        ptsId: pts.id,
        descTecnica: "Elevação ativa do ombro a 90°",
        descAcessivel: "Levantar o braço devagar",
        criteriosJson: ["sem dor"],
        prazo: new Date("2026-10-25"),
        donoId: adminId,
      },
    });

    const emitido = await gerarLinkCidadao({ ptsId: pts.id });
    if (!emitido.ok) throw new Error("esperava emissão ok");
    const codigo = codigoDoLink(emitido.link);

    const resultado = await buscarPortalPorCodigo(codigo);
    expect(resultado.estado).toBe("ATIVO");
    expect(resultado.view?.pacienteNome).toBe(nome);
    expect(resultado.view?.metas).toHaveLength(1);
    expect(resultado.view?.etapas[0].situacao).toBe("atual");

    const acesso = await db.acessoCidadao.findFirstOrThrow({
      where: { ptsId: pts.id, revogadoEm: null },
    });
    acessoIds.push(acesso.id);
    expect(acesso.totalAcessos).toBe(1);
    expect(acesso.ultimoAcessoEm).not.toBeNull();

    const logs = await db.acessoCidadaoLog.findMany({
      where: { acessoCidadaoId: acesso.id },
    });
    expect(logs).toHaveLength(1);

    await buscarPortalPorCodigo(codigo);
    const depois = await db.acessoCidadao.findUniqueOrThrow({
      where: { id: acesso.id },
      select: { totalAcessos: true },
    });
    expect(depois.totalAcessos).toBe(2);
    expect(
      await db.acessoCidadaoLog.count({ where: { acessoCidadaoId: acesso.id } }),
    ).toBe(2);
  });

  it("código inexistente é INVALIDO e não registra nada", async () => {
    const resultado = await buscarPortalPorCodigo("ABCDE-FGHJK");
    expect(resultado).toEqual({ estado: "INVALIDO", view: null });
  });

  it("link expirado é EXPIRADO", async () => {
    const pts = await ptsComNome(`Pac Expira ${randomUUID().slice(0, 8)}`);
    const emitido = await gerarLinkCidadao({ ptsId: pts.id });
    if (!emitido.ok) throw new Error("esperava emissão ok");

    const acesso = await db.acessoCidadao.findFirstOrThrow({
      where: { ptsId: pts.id },
    });
    acessoIds.push(acesso.id);
    await db.acessoCidadao.update({
      where: { id: acesso.id },
      data: { expiraEm: new Date(Date.now() - 1000) },
    });

    const resultado = await buscarPortalPorCodigo(codigoDoLink(emitido.link));
    expect(resultado).toEqual({ estado: "EXPIRADO", view: null });
  });

  it("aceita o código digitado em minúsculo e sem hífen", async () => {
    const pts = await ptsComNome(`Pac Digitado ${randomUUID().slice(0, 8)}`);
    const emitido = await gerarLinkCidadao({ ptsId: pts.id });
    if (!emitido.ok) throw new Error("esperava emissão ok");
    const acesso = await db.acessoCidadao.findFirstOrThrow({
      where: { ptsId: pts.id, revogadoEm: null },
    });
    acessoIds.push(acesso.id);

    const cru = codigoDoLink(emitido.link).replace("-", "").toLowerCase();
    const resultado = await buscarPortalPorCodigo(cru);
    expect(resultado.estado).toBe("ATIVO");
  });
});

describe("buscarAcessoCidadaoDoPts", () => {
  it("relata link inexistente, ativo e seus acessos", async () => {
    const pts = await ptsComNome(`Pac Info ${randomUUID().slice(0, 8)}`);

    expect(await buscarAcessoCidadaoDoPts(pts.id)).toEqual({
      existe: false,
      valido: false,
      criadoEm: null,
      expiraEm: null,
      ultimoAcessoEm: null,
      totalAcessos: 0,
    });

    const emitido = await gerarLinkCidadao({ ptsId: pts.id });
    if (!emitido.ok) throw new Error("esperava emissão ok");
    await buscarPortalPorCodigo(codigoDoLink(emitido.link));

    const info = await buscarAcessoCidadaoDoPts(pts.id);
    expect(info.existe).toBe(true);
    expect(info.valido).toBe(true);
    expect(info.totalAcessos).toBe(1);
    expect(info.ultimoAcessoEm).not.toBeNull();

    const acesso = await db.acessoCidadao.findFirstOrThrow({
      where: { ptsId: pts.id, revogadoEm: null },
    });
    acessoIds.push(acesso.id);
  });
});
