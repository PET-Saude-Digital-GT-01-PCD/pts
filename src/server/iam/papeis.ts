"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { BasePapel } from "@prisma/client";

import { db } from "@/lib/db";
import { requirePermissao } from "@/server/iam/session";
import { podeDeletarPapel, validarRecursos } from "@/server/iam/permissoes";

const basePapelSchema = z.enum(["CLINICO", "GESTOR", "ADMIN"]);

const papelInputSchema = z.object({
  nome: z.string().trim().min(2).max(60),
  descricao: z.string().trim().max(255).optional(),
  base: basePapelSchema,
  recursos: z.array(z.string()).default([]),
});

type Resultado = { ok: boolean; erro?: string };

function erroDaValidacao(base: BasePapel, recursos: string[]): string | null {
  const v = validarRecursos(base, recursos);
  if (!v.ok) return v.violacoes.join(". ");
  return null;
}

export async function criarPapel(
  input: unknown,
): Promise<Resultado> {
  const user = await requirePermissao("admin.papeis.gerenciar");
  const parsed = papelInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, erro: "Dados inválidos: verifique nome e base." };
  }

  const erro = erroDaValidacao(parsed.data.base, parsed.data.recursos);
  if (erro) return { ok: false, erro };

  const existente = await db.papel.findFirst({
    where: { cerId: user.cerId ?? undefined, nome: parsed.data.nome },
  });
  if (existente) return { ok: false, erro: "Já existe papel com esse nome." };

  try {
    await db.$transaction(async (tx) => {
      const papel = await tx.papel.create({
        data: {
          cerId: user.cerId ?? "",
          nome: parsed.data.nome,
          descricao: parsed.data.descricao,
          base: parsed.data.base,
        },
      });

      if (parsed.data.recursos.length > 0) {
        const recursos = await tx.recurso.findMany({
          where: { chave: { in: parsed.data.recursos } },
          select: { id: true },
        });
        await tx.papelRecurso.createMany({
          data: recursos.map((r) => ({
            papelId: papel.id,
            recursoId: r.id,
          })),
          skipDuplicates: true,
        });
      }

      await tx.auditoria.create({
        data: {
          actorId: user.id,
          action: "papel.criar",
          entityType: "papel",
          entityId: papel.id,
          afterJson: {
            nome: papel.nome,
            base: papel.base,
            recursos: parsed.data.recursos,
          },
        },
      });
    });

    revalidatePath("/dashboard/papeis");
    return { ok: true };
  } catch {
    return { ok: false, erro: "Erro ao salvar o papel." };
  }
}

export async function atualizarPapel(
  papelId: string,
  input: unknown,
): Promise<Resultado> {
  const user = await requirePermissao("admin.papeis.gerenciar");
  const parsed = papelInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, erro: "Dados inválidos: verifique nome e base." };
  }

  const papel = await db.papel.findUnique({
    where: { id: papelId },
    include: { recursos: { include: { recurso: true } } },
  });
  if (!papel) return { ok: false, erro: "Papel não encontrado." };

  const recursosAtuais = papel.recursos.map((pr) => pr.recurso.chave);
  const erro = erroDaValidacao(parsed.data.base, parsed.data.recursos);
  if (erro) return { ok: false, erro };

  if (parsed.data.base !== papel.base) {
    const erroBase = erroDaValidacao(parsed.data.base, recursosAtuais);
    if (erroBase) {
      return {
        ok: false,
        erro: `${erroBase} (remova antes de mudar a base).`,
      };
    }
  }

  try {
    await db.$transaction(async (tx) => {
      await tx.papel.update({
        where: { id: papelId },
        data: {
          nome: parsed.data.nome,
          descricao: parsed.data.descricao,
          base: parsed.data.base,
        },
      });

      const chaves = parsed.data.recursos;
      const recursos = await tx.recurso.findMany({
        where: { chave: { in: chaves } },
        select: { id: true },
      });

      await tx.papelRecurso.deleteMany({ where: { papelId } });
      await tx.papelRecurso.createMany({
        data: recursos.map((r) => ({ papelId, recursoId: r.id })),
        skipDuplicates: true,
      });

      await tx.auditoria.create({
        data: {
          actorId: user.id,
          action: "papel.atualizar",
          entityType: "papel",
          entityId: papelId,
          beforeJson: {
            nome: papel.nome,
            base: papel.base,
            recursos: recursosAtuais,
          },
          afterJson: {
            nome: parsed.data.nome,
            base: parsed.data.base,
            recursos: chaves,
          },
        },
      });
    });

    revalidatePath("/dashboard/papeis");
    revalidatePath(`/dashboard/papeis/${papelId}`);
    return { ok: true };
  } catch {
    return { ok: false, erro: "Erro ao salvar o papel." };
  }
}

export async function atualizarRecursos(
  papelId: string,
  chaves: string[],
): Promise<Resultado> {
  const user = await requirePermissao("admin.papeis.gerenciar");

  const papel = await db.papel.findUnique({
    where: { id: papelId },
    include: { recursos: { include: { recurso: true } } },
  });
  if (!papel) return { ok: false, erro: "Papel não encontrado." };

  const erro = erroDaValidacao(papel.base, chaves);
  if (erro) return { ok: false, erro };

  const recursosAtuais = papel.recursos.map((pr) => pr.recurso.chave);

  try {
    await db.$transaction(async (tx) => {
      const recursos = await tx.recurso.findMany({
        where: { chave: { in: chaves } },
        select: { id: true },
      });

      await tx.papelRecurso.deleteMany({ where: { papelId } });
      await tx.papelRecurso.createMany({
        data: recursos.map((r) => ({ papelId, recursoId: r.id })),
        skipDuplicates: true,
      });

      await tx.auditoria.create({
        data: {
          actorId: user.id,
          action: "papel.permissao.atualizar",
          entityType: "papel",
          entityId: papelId,
          beforeJson: { recursos: recursosAtuais },
          afterJson: { recursos: chaves },
        },
      });
    });

    revalidatePath("/dashboard/papeis");
    revalidatePath(`/dashboard/papeis/${papelId}`);
    return { ok: true };
  } catch {
    return { ok: false, erro: "Erro ao salvar as permissões." };
  }
}

export async function deletarPapel(papelId: string): Promise<Resultado> {
  const user = await requirePermissao("admin.papeis.gerenciar");

  const papel = await db.papel.findUnique({
    where: { id: papelId },
    include: { _count: { select: { usuarios: true } } },
  });
  if (!papel) return { ok: false, erro: "Papel não encontrado." };

  const emUso = papel._count.usuarios > 0;
  const ehAdmin = papel.base === "ADMIN";
  const ultimoAdminAtivo =
    ehAdmin && (await db.usuario.count({
      where: { papel: { base: "ADMIN" }, status: "ATIVO" },
    })) <= 1;

  if (!podeDeletarPapel(emUso, ultimoAdminAtivo)) {
    if (emUso) return { ok: false, erro: "Papel em uso não pode ser deletado." };
    return { ok: false, erro: "Deve haver ao menos um admin ativo." };
  }

  try {
    await db.$transaction(async (tx) => {
      await tx.papelRecurso.deleteMany({ where: { papelId } });
      await tx.papel.delete({ where: { id: papelId } });
      await tx.auditoria.create({
        data: {
          actorId: user.id,
          action: "papel.deletar",
          entityType: "papel",
          entityId: papelId,
          beforeJson: { nome: papel.nome, base: papel.base },
        },
      });
    });

    revalidatePath("/dashboard/papeis");
    return { ok: true };
  } catch {
    return { ok: false, erro: "Erro ao deletar o papel." };
  }
}

export async function atribuirPapelUsuario(
  usuarioId: string,
  papelId: string,
): Promise<Resultado> {
  const user = await requirePermissao("admin.papeis.gerenciar");

  const [usuario, papel] = await Promise.all([
    db.usuario.findUnique({ where: { id: usuarioId } }),
    db.papel.findUnique({ where: { id: papelId } }),
  ]);
  if (!usuario || !papel) return { ok: false, erro: "Usuário ou papel não encontrado." };

  if (papel.cerId !== usuario.cerId) {
    return { ok: false, erro: "Papel não pertence ao mesmo CER do usuário." };
  }

  try {
    await db.$transaction(async (tx) => {
      await tx.usuario.update({
        where: { id: usuarioId },
        data: { papelId },
      });
      await tx.auditoria.create({
        data: {
          actorId: user.id,
          action: "usuario.papel.atribuir",
          entityType: "usuario",
          entityId: usuarioId,
          beforeJson: { papelId: usuario.papelId },
          afterJson: { papelId },
        },
      });
    });

    revalidatePath("/dashboard/usuarios");
    return { ok: true };
  } catch {
    return { ok: false, erro: "Erro ao atribuir o papel." };
  }
}
