"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
import { requirePermissao } from "@/server/iam/session";
import { podeAprovar, podeRejeitar } from "@/server/iam/permissoes";

type Resultado = { ok: boolean; erro?: string };

/** Aprova um usuário PENDENTE → ATIVO. Auditoria na mesma transação (ADR-0005). */
export async function aprovarUsuario(usuarioId: string): Promise<Resultado> {
  const admin = await requirePermissao("admin.usuarios.aprovar");

  const idSchema = z.string().uuid();
  if (!idSchema.safeParse(usuarioId).success) {
    return { ok: false, erro: "ID de usuário inválido." };
  }

  const usuario = await db.usuario.findUnique({
    where: { id: usuarioId, cerId: admin.cerId ?? undefined },
    select: { id: true, status: true, nome: true, email: true },
  });
  if (!usuario) return { ok: false, erro: "Usuário não encontrado." };

  if (!podeAprovar(usuario.status)) {
    return { ok: false, erro: "Apenas usuários PENDENTES podem ser aprovados." };
  }

  try {
    await db.$transaction(async (tx) => {
      await tx.usuario.update({
        where: { id: usuarioId },
        data: { status: "ATIVO" },
      });

      await tx.auditoria.create({
        data: {
          actorId: admin.id,
          action: "usuario.aprovado",
          entityType: "usuario",
          entityId: usuarioId,
          beforeJson: { status: usuario.status },
          afterJson: { status: "ATIVO" },
        },
      });
    });

    revalidatePath("/dashboard/usuarios");
    return { ok: true };
  } catch (err) {
    console.error("Erro ao aprovar usuário:", err);
    return { ok: false, erro: "Erro ao aprovar o usuário." };
  }
}

/** Rejeita um usuário PENDENTE → BLOQUEADO. Motivo obrigatório (≥ 10 chars). */
export async function rejeitarUsuario(
  usuarioId: string,
  motivo: string,
): Promise<Resultado> {
  const admin = await requirePermissao("admin.usuarios.aprovar");

  const idSchema = z.string().uuid();
  if (!idSchema.safeParse(usuarioId).success) {
    return { ok: false, erro: "ID de usuário inválido." };
  }

  const usuario = await db.usuario.findUnique({
    where: { id: usuarioId, cerId: admin.cerId ?? undefined },
    select: { id: true, status: true },
  });
  if (!usuario) return { ok: false, erro: "Usuário não encontrado." };

  if (!podeRejeitar(usuario.status, motivo)) {
    if (usuario.status !== "PENDENTE") {
      return { ok: false, erro: "Apenas usuários PENDENTES podem ser rejeitados." };
    }
    return { ok: false, erro: "Motivo da rejeição deve ter ao menos 10 caracteres." };
  }

  try {
    await db.$transaction(async (tx) => {
      await tx.usuario.update({
        where: { id: usuarioId },
        data: { status: "BLOQUEADO" },
      });

      await tx.auditoria.create({
        data: {
          actorId: admin.id,
          action: "usuario.rejeitado",
          entityType: "usuario",
          entityId: usuarioId,
          beforeJson: { status: usuario.status },
          afterJson: { status: "BLOQUEADO" },
          motivo: motivo.trim(),
        },
      });
    });

    revalidatePath("/dashboard/usuarios");
    return { ok: true };
  } catch (err) {
    console.error("Erro ao rejeitar usuário:", err);
    return { ok: false, erro: "Erro ao rejeitar o usuário." };
  }
}
