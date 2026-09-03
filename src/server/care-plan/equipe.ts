"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import { requirePermissao } from "@/server/iam/session";

// Gestor vincula profissionais ao caso (#69). Gestor NÃO acessa conteúdo
// clínico via aqui — só lê metadado de equipe (nome, categoria, papel no
// caso), nunca SOAP/avaliações/metas/mural. Guardado por
// care-plan.equipe.gerenciar (base GESTOR não é "clinical.", já permitido
// pelo guardrail existente).

type Resultado = { ok: true } | { ok: false; erro: string };

export type CasoParaEquipe = {
  ptsId: string;
  pacienteNome: string;
  status: string;
  refProfissionalNome: string | null;
  totalEquipe: number;
};

export async function listarCasosParaEquipe(): Promise<CasoParaEquipe[]> {
  const user = await requirePermissao("care-plan.equipe.gerenciar");

  const casos = await db.pts.findMany({
    where: { cerId: user.cerId ?? undefined, status: { not: "FECHADO" } },
    orderBy: { criadoEm: "desc" },
    select: {
      id: true,
      status: true,
      paciente: { select: { nome: true } },
      refProfissional: { select: { nome: true } },
      _count: { select: { equipePts: true } },
    },
  });

  return casos.map((c) => ({
    ptsId: c.id,
    pacienteNome: c.paciente.nome,
    status: c.status,
    refProfissionalNome: c.refProfissional?.nome ?? null,
    totalEquipe: c._count.equipePts,
  }));
}

export type MembroEquipe = {
  usuarioId: string;
  nome: string;
  categoria: string | null;
  papelNoCaso: string;
  vinculadoEm: Date;
};

export type ProfissionalDisponivel = {
  id: string;
  nome: string;
  categoria: string | null;
};

export type DetalheEquipeCaso = {
  ptsId: string;
  pacienteNome: string;
  refProfissionalNome: string | null;
  membros: MembroEquipe[];
  disponiveis: ProfissionalDisponivel[];
};

export async function buscarEquipeCaso(
  ptsId: string,
): Promise<DetalheEquipeCaso | null> {
  const user = await requirePermissao("care-plan.equipe.gerenciar");

  const pts = await db.pts.findUnique({
    where: { id: ptsId },
    select: {
      cerId: true,
      paciente: { select: { nome: true } },
      refProfissional: { select: { nome: true } },
      equipePts: {
        orderBy: { vinculadoEm: "asc" },
        select: {
          papelNoCaso: true,
          vinculadoEm: true,
          usuario: { select: { id: true, nome: true, categoria: true } },
        },
      },
    },
  });
  if (!pts || pts.cerId !== user.cerId) return null;

  const membrosIds = pts.equipePts.map((m) => m.usuario.id);
  const disponiveis = await db.usuario.findMany({
    where: {
      cerId: user.cerId ?? undefined,
      status: "ATIVO",
      papel: { base: "CLINICO" },
      id: { notIn: membrosIds },
    },
    orderBy: { nome: "asc" },
    select: { id: true, nome: true, categoria: true },
  });

  return {
    ptsId,
    pacienteNome: pts.paciente.nome,
    refProfissionalNome: pts.refProfissional?.nome ?? null,
    membros: pts.equipePts.map((m) => ({
      usuarioId: m.usuario.id,
      nome: m.usuario.nome,
      categoria: m.usuario.categoria,
      papelNoCaso: m.papelNoCaso,
      vinculadoEm: m.vinculadoEm,
    })),
    disponiveis,
  };
}

const adicionarSchema = z.object({
  ptsId: z.string().uuid(),
  usuarioId: z.string().uuid(),
  papelNoCaso: z.string().trim().min(1, "Informe o papel no caso.").max(120),
});

export async function adicionarMembroEquipe(input: unknown): Promise<Resultado> {
  const user = await requirePermissao("care-plan.equipe.gerenciar");
  const parsed = adicionarSchema.safeParse(input);
  if (!parsed.success) return { ok: false, erro: parsed.error.issues[0].message };
  const { ptsId, usuarioId, papelNoCaso } = parsed.data;

  const [pts, usuario] = await Promise.all([
    db.pts.findUnique({ where: { id: ptsId }, select: { cerId: true } }),
    db.usuario.findUnique({ where: { id: usuarioId }, select: { cerId: true } }),
  ]);
  if (!pts || pts.cerId !== user.cerId) return { ok: false, erro: "Caso não encontrado." };
  if (!usuario || usuario.cerId !== user.cerId) {
    return { ok: false, erro: "Usuário não encontrado neste CER." };
  }

  try {
    await db.$transaction(async (tx) => {
      const membro = await tx.equipePts.create({
        data: { ptsId, usuarioId, papelNoCaso },
      });
      await tx.auditoria.create({
        data: {
          actorId: user.id,
          action: "equipe.adicionar",
          entityType: "equipe_pts",
          entityId: membro.id,
          afterJson: { ptsId, usuarioId, papelNoCaso },
        },
      });
    });

    revalidatePath(`/dashboard/casos/${ptsId}/equipe`);
    return { ok: true };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { ok: false, erro: "Este profissional já está na equipe do caso." };
    }
    return { ok: false, erro: "Erro ao adicionar à equipe." };
  }
}

const removerSchema = z.object({
  ptsId: z.string().uuid(),
  usuarioId: z.string().uuid(),
});

export async function removerMembroEquipe(input: unknown): Promise<Resultado> {
  const user = await requirePermissao("care-plan.equipe.gerenciar");
  const parsed = removerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, erro: "Dados inválidos." };
  const { ptsId, usuarioId } = parsed.data;

  const membro = await db.equipePts.findUnique({
    where: { usuarioId_ptsId: { usuarioId, ptsId } },
  });
  if (!membro) return { ok: false, erro: "Vínculo não encontrado." };

  await db.$transaction(async (tx) => {
    await tx.equipePts.delete({ where: { id: membro.id } });
    await tx.auditoria.create({
      data: {
        actorId: user.id,
        action: "equipe.remover",
        entityType: "equipe_pts",
        entityId: membro.id,
        beforeJson: { ptsId, usuarioId, papelNoCaso: membro.papelNoCaso },
      },
    });
  });

  revalidatePath(`/dashboard/casos/${ptsId}/equipe`);
  return { ok: true };
}
