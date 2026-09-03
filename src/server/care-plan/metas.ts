"use server";

import { Prisma, StatusMeta } from "@prisma/client";
import { z } from "zod";

import { db } from "@/lib/db";
import { exigirUmaDas, temUmaDas } from "@/server/care-plan/acesso";
import { requireAuth } from "@/server/iam/session";
import { podeAcessarCaso } from "@/server/shared/acesso-caso";
import {
  metaInputSchema,
  transicaoStatusValida,
} from "@/server/care-plan/meta-schema";

export type Resultado =
  | { ok: true }
  | { ok: false; erro: string; codigo?: number };

class ConflitoVersao extends Error {
  readonly codigo = 409;
}

export type MetaDoPainel = {
  id: string;
  descTecnica: string;
  descAcessivel: string;
  status: StatusMeta;
  prazo: Date;
  dataPactuacao: Date;
  versao: number;
  dominioFuncional: string | null;
  donoNome: string;
  donoCategoria: string | null;
};

export async function listarMetas(ptsId: string): Promise<MetaDoPainel[]> {
  if (!(await temUmaDas(["care-plan.meta.ler"]))) return [];
  const user = await requireAuth();
  if (!(await podeAcessarCaso(user.id, ptsId))) return [];
  const rows = await db.meta.findMany({
    where: { ptsId },
    orderBy: [{ status: "asc" }, { prazo: "asc" }],
    select: {
      id: true,
      descTecnica: true,
      descAcessivel: true,
      status: true,
      prazo: true,
      dataPactuacao: true,
      versao: true,
      criteriosJson: true,
      dono: { select: { nome: true, categoria: true } },
    },
  });
  return rows.map((m) => {
    const criterios = m.criteriosJson as Record<string, unknown> | null;
    const dominio = criterios?.dominioFuncional;
    return {
      id: m.id,
      descTecnica: m.descTecnica,
      descAcessivel: m.descAcessivel,
      status: m.status,
      prazo: m.prazo,
      dataPactuacao: m.dataPactuacao,
      versao: m.versao,
      dominioFuncional: typeof dominio === "string" ? dominio : null,
      donoNome: m.dono.nome,
      donoCategoria: m.dono.categoria,
    };
  });
}

export async function criarMeta(input: unknown): Promise<Resultado> {
  let user;
  try {
    user = await exigirUmaDas(["care-plan.meta.escrever"]);
  } catch {
    return { ok: false, erro: "Sem permissão para criar metas." };
  }

  const parsed = metaInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      erro: "Dados inválidos: descreva a meta em dupla linguagem (técnica e acessível), com critérios SMART e prazo.",
    };
  }
  const dados = parsed.data;

  if (!(await podeAcessarCaso(user.id, dados.ptsId))) {
    return { ok: false, erro: "Você não está vinculado a este caso." };
  }

  try {
    await db.$transaction(async (tx) => {
      const ptsExiste = await tx.pts.findUnique({
        where: { id: dados.ptsId },
        select: { id: true },
      });
      if (!ptsExiste) throw new Error("PTS não encontrado.");

      const meta = await tx.meta.create({
        data: {
          ptsId: dados.ptsId,
          avaliacaoId: dados.avaliacaoId,
          donoId: dados.donoId,
          descTecnica: dados.descTecnica,
          descAcessivel: dados.descAcessivel,
          criteriosJson: dados.criteriosJson as object,
          prazo: dados.prazo,
        },
      });

      await tx.metaStatusHistorico.create({
        data: { metaId: meta.id, de: null, para: "NOVA", autorId: user.id },
      });

      await tx.auditoria.create({
        data: {
          actorId: user.id,
          action: "meta.criar",
          entityType: "meta",
          entityId: meta.id,
          afterJson: {
            ptsId: dados.ptsId,
            donoId: dados.donoId,
            prazo: dados.prazo.toISOString(),
          },
        },
      });
    });

    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      erro: e instanceof Error ? e.message : "Erro ao criar meta.",
    };
  }
}

export async function mudarStatusMeta(
  input: unknown,
): Promise<Resultado> {
  let user;
  try {
    user = await exigirUmaDas(["care-plan.meta.escrever"]);
  } catch {
    return { ok: false, erro: "Sem permissão para editar metas." };
  }

  const schema = z.object({
    metaId: z.string().uuid(),
    para: z.nativeEnum(StatusMeta),
    motivo: z.string().trim().max(500).optional(),
    version: z.number().int().min(0),
  });
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, erro: "Dados inválidos." };
  const { metaId, para, motivo, version } = parsed.data;

  const metaAtual = await db.meta.findUnique({
    where: { id: metaId },
    select: { ptsId: true },
  });
  if (!metaAtual) return { ok: false, erro: "Meta não encontrada." };
  if (!(await podeAcessarCaso(user.id, metaAtual.ptsId))) {
    return { ok: false, erro: "Você não está vinculado a este caso." };
  }

  try {
    await db.$transaction(async (tx) => {
      const meta = await tx.meta.findUniqueOrThrow({
        where: { id: metaId },
        select: { id: true, ptsId: true, status: true, versao: true },
      });

      if (!transicaoStatusValida(meta.status, para)) {
        throw new Error(
          `Transição inválida de ${meta.status} para ${para}.`,
        );
      }

      const atualizada = await tx.meta.updateMany({
        where: { id: metaId, versao: version },
        data: { status: para, versao: version + 1 },
      });
      if (atualizada.count === 0) {
        throw new ConflitoVersao(
          "Conflito de versão: a meta foi alterada por outra pessoa. Recarregue a página.",
        );
      }

      await tx.metaStatusHistorico.create({
        data: {
          metaId,
          de: meta.status,
          para,
          autorId: user.id,
          motivo,
        },
      });

      await tx.auditoria.create({
        data: {
          actorId: user.id,
          action: "meta.status",
          entityType: "meta",
          entityId: metaId,
          beforeJson: { status: meta.status, versao: meta.versao },
          afterJson: { status: para, versao: version + 1 },
          motivo,
        },
      });
    });

    return { ok: true };
  } catch (e) {
    if (e instanceof ConflitoVersao) {
      return { ok: false, erro: e.message, codigo: e.codigo };
    }
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      return { ok: false, erro: "Meta não encontrada." };
    }
    return {
      ok: false,
      erro: e instanceof Error ? e.message : "Erro ao mudar status da meta.",
    };
  }
}
