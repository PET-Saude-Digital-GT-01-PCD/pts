import { describe, expect, it, vi, beforeAll, afterAll, beforeEach } from "vitest";
import { randomUUID } from "node:crypto";

const sessao = vi.hoisted(() => ({
  chaves: [] as string[],
  actorId: "",
  cerId: "",
}));

vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

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
import {
  adicionarMembroEquipe,
  buscarEquipeCaso,
  listarCasosParaEquipe,
  removerMembroEquipe,
} from "@/server/care-plan/equipe";

const CER_ID = "00000000-0000-4000-8000-000000000001";

let adminId: string;
let cerOutroId: string;
let papelOutroId: string;
let clinicoId: string;
let clinicoForaId: string;
const pacienteIds: string[] = [];
const ptsIds: string[] = [];

async function criarPts(
  { cerId = CER_ID, status = "EM_AVALIACAO" }: { cerId?: string; status?: "EM_AVALIACAO" | "FECHADO" } = {},
) {
  const paciente = await db.paciente.create({
    data: {
      cerId,
      nome: `Paciente Equipe ${randomUUID().slice(0, 8)}`,
      dtnasc: new Date("1990-01-01"),
      sexo: "OUTRO",
    },
  });
  pacienteIds.push(paciente.id);
  const pts = await db.pts.create({ data: { pacienteId: paciente.id, cerId, status } });
  ptsIds.push(pts.id);
  return pts.id;
}

const vinculos = (ptsId: string) => db.equipePts.findMany({ where: { ptsId } });

beforeAll(async () => {
  const [admin, fisio] = await Promise.all([
    db.usuario.findUniqueOrThrow({ where: { email: "admin@pts.local" }, select: { id: true } }),
    db.usuario.findUniqueOrThrow({ where: { email: "fisio@pts.local" }, select: { id: true } }),
  ]);
  adminId = admin.id;
  clinicoId = fisio.id;

  const outro = await db.cer.create({
    data: { nome: `CER Equipe ${randomUUID().slice(0, 8)}`, municipio: "Teste" },
  });
  cerOutroId = outro.id;
  const papel = await db.papel.create({
    data: { cerId: cerOutroId, nome: `Clin ${randomUUID().slice(0, 8)}`, base: "CLINICO" },
  });
  papelOutroId = papel.id;
  const fora = await db.usuario.create({
    data: {
      cerId: cerOutroId,
      email: `equipe-fora-${randomUUID().slice(0, 8)}@pts.local`,
      senhaHash: "hash-placeholder",
      nome: "Profissional de Outro CER",
      categoria: "MEDICO",
      papelId: papelOutroId,
    },
  });
  clinicoForaId = fora.id;
});

beforeEach(() => {
  sessao.chaves = ["care-plan.equipe.gerenciar"];
  sessao.actorId = adminId;
  sessao.cerId = CER_ID;
});

afterAll(async () => {
  const membros = await db.equipePts.findMany({
    where: { ptsId: { in: ptsIds } },
    select: { id: true },
  });
  await db.auditoria.deleteMany({
    where: { entityType: "equipe_pts", entityId: { in: membros.map((m) => m.id) } },
  });
  await db.equipePts.deleteMany({ where: { ptsId: { in: ptsIds } } });
  await db.pts.deleteMany({ where: { id: { in: ptsIds } } });
  await db.paciente.deleteMany({ where: { id: { in: pacienteIds } } });
  await db.usuario.delete({ where: { id: clinicoForaId } });
  await db.papel.delete({ where: { id: papelOutroId } });
  await db.cer.delete({ where: { id: cerOutroId } });
  await db.$disconnect();
});

describe("care-plan/equipe — permissão", () => {
  it("sem care-plan.equipe.gerenciar todas as actions recusam (redirect)", async () => {
    const ptsId = await criarPts();
    sessao.chaves = ["clinical.soap.escrever"];
    await expect(listarCasosParaEquipe()).rejects.toThrow();
    await expect(buscarEquipeCaso(ptsId)).rejects.toThrow();
    await expect(
      adicionarMembroEquipe({ ptsId, usuarioId: clinicoId, papelNoCaso: "Fisio" }),
    ).rejects.toThrow();
    await expect(removerMembroEquipe({ ptsId, usuarioId: clinicoId })).rejects.toThrow();
    expect(await vinculos(ptsId)).toHaveLength(0);
  });
});

describe("care-plan/equipe — leitura", () => {
  it("listarCasosParaEquipe mostra só casos abertos do próprio CER, com total da equipe", async () => {
    const aberto = await criarPts();
    const fechado = await criarPts({ status: "FECHADO" });
    const deFora = await criarPts({ cerId: cerOutroId });
    await adicionarMembroEquipe({ ptsId: aberto, usuarioId: clinicoId, papelNoCaso: "Fisio" });

    const casos = await listarCasosParaEquipe();
    const ids = casos.map((c) => c.ptsId);
    expect(ids).toContain(aberto);
    expect(ids).not.toContain(fechado);
    expect(ids).not.toContain(deFora);
    expect(casos.find((c) => c.ptsId === aberto)?.totalEquipe).toBe(1);
  });

  it("buscarEquipeCaso lista membros e tira-os dos disponíveis; caso de outro CER → null", async () => {
    const ptsId = await criarPts();
    await adicionarMembroEquipe({ ptsId, usuarioId: clinicoId, papelNoCaso: "Fisio" });

    const detalhe = await buscarEquipeCaso(ptsId);
    expect(detalhe?.membros.map((m) => m.usuarioId)).toEqual([clinicoId]);
    expect(detalhe?.disponiveis.map((d) => d.id)).not.toContain(clinicoId);
    expect(detalhe?.disponiveis.map((d) => d.id)).not.toContain(clinicoForaId);

    expect(await buscarEquipeCaso(await criarPts({ cerId: cerOutroId }))).toBeNull();
  });
});

describe("care-plan/equipe — adicionarMembroEquipe", () => {
  it("vincula e audita equipe.adicionar", async () => {
    const ptsId = await criarPts();
    expect(
      await adicionarMembroEquipe({ ptsId, usuarioId: clinicoId, papelNoCaso: "Fisioterapia" }),
    ).toEqual({ ok: true });

    const [membro] = await vinculos(ptsId);
    expect(membro).toMatchObject({ usuarioId: clinicoId, papelNoCaso: "Fisioterapia" });
    const aud = await db.auditoria.findFirstOrThrow({
      where: { entityType: "equipe_pts", entityId: membro.id, action: "equipe.adicionar" },
    });
    expect(aud.actorId).toBe(adminId);
  });

  it("vínculo duplicado (inclusive dois cliques concorrentes) vira erro amigável, sem 2º registro", async () => {
    const ptsId = await criarPts();
    const input = { ptsId, usuarioId: clinicoId, papelNoCaso: "Fisio" };
    const resultados = await Promise.all([adicionarMembroEquipe(input), adicionarMembroEquipe(input)]);

    expect(resultados.filter((r) => r.ok)).toHaveLength(1);
    expect(resultados.find((r) => !r.ok)).toEqual({
      ok: false,
      erro: "Este profissional já está na equipe do caso.",
    });
    expect(await vinculos(ptsId)).toHaveLength(1);
  });

  it("papel no caso vazio é recusado", async () => {
    const ptsId = await criarPts();
    const r = await adicionarMembroEquipe({ ptsId, usuarioId: clinicoId, papelNoCaso: "  " });
    expect(r).toEqual({ ok: false, erro: "Informe o papel no caso." });
  });

  it("caso de outro CER, usuário de outro CER e usuário inexistente são recusados", async () => {
    const ptsFora = await criarPts({ cerId: cerOutroId });
    expect(
      await adicionarMembroEquipe({ ptsId: ptsFora, usuarioId: clinicoId, papelNoCaso: "x" }),
    ).toEqual({ ok: false, erro: "Caso não encontrado." });

    const ptsId = await criarPts();
    for (const usuarioId of [clinicoForaId, randomUUID()]) {
      expect(await adicionarMembroEquipe({ ptsId, usuarioId, papelNoCaso: "x" })).toEqual({
        ok: false,
        erro: "Usuário não encontrado neste CER.",
      });
    }
    expect(await vinculos(ptsId)).toHaveLength(0);
  });

  it("PTS FECHADO é somente leitura: não aceita novo membro", async () => {
    const ptsId = await criarPts({ status: "FECHADO" });
    const r = await adicionarMembroEquipe({ ptsId, usuarioId: clinicoId, papelNoCaso: "Fisio" });
    expect(r).toEqual({
      ok: false,
      erro: "PTS fechado é somente leitura; não aceita novas alterações.",
    });
    expect(await vinculos(ptsId)).toHaveLength(0);
  });
});

describe("care-plan/equipe — removerMembroEquipe", () => {
  it("remove e audita equipe.remover com o estado anterior", async () => {
    const ptsId = await criarPts();
    await adicionarMembroEquipe({ ptsId, usuarioId: clinicoId, papelNoCaso: "Fisio" });
    const [membro] = await vinculos(ptsId);

    expect(await removerMembroEquipe({ ptsId, usuarioId: clinicoId })).toEqual({ ok: true });
    expect(await vinculos(ptsId)).toHaveLength(0);
    const aud = await db.auditoria.findFirstOrThrow({
      where: { entityType: "equipe_pts", entityId: membro.id, action: "equipe.remover" },
    });
    expect(aud.beforeJson).toMatchObject({ ptsId, usuarioId: clinicoId, papelNoCaso: "Fisio" });
  });

  it("vínculo inexistente e input inválido são recusados", async () => {
    const ptsId = await criarPts();
    expect(await removerMembroEquipe({ ptsId, usuarioId: clinicoId })).toEqual({
      ok: false,
      erro: "Vínculo não encontrado.",
    });
    expect(await removerMembroEquipe({ ptsId: "x", usuarioId: clinicoId })).toEqual({
      ok: false,
      erro: "Dados inválidos.",
    });
  });

  it("gestor de outro CER não remove membro do caso", async () => {
    const ptsId = await criarPts();
    await adicionarMembroEquipe({ ptsId, usuarioId: clinicoId, papelNoCaso: "Fisio" });

    sessao.cerId = cerOutroId;
    expect(await removerMembroEquipe({ ptsId, usuarioId: clinicoId })).toEqual({
      ok: false,
      erro: "Caso não encontrado.",
    });
    expect(await vinculos(ptsId)).toHaveLength(1);
  });

  it("PTS FECHADO é somente leitura: não remove membro", async () => {
    const ptsId = await criarPts();
    await adicionarMembroEquipe({ ptsId, usuarioId: clinicoId, papelNoCaso: "Fisio" });
    await db.pts.update({ where: { id: ptsId }, data: { status: "FECHADO" } });

    expect(await removerMembroEquipe({ ptsId, usuarioId: clinicoId })).toEqual({
      ok: false,
      erro: "PTS fechado é somente leitura; não aceita novas alterações.",
    });
    expect(await vinculos(ptsId)).toHaveLength(1);
  });
});
