"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { getAtorReal, requirePermissao } from "@/server/iam/session";
import { podeImpersonar } from "@/server/iam/permissoes";

type Resultado = { ok: true } | { ok: false; erro: string };

export async function iniciarImpersonacao(alvoId: string): Promise<Resultado> {
  const ator = await requirePermissao("admin.usuarios.impersonar");

  const alvo = await db.usuario.findUnique({
    where: { id: alvoId },
    include: { papel: true },
  });
  if (!alvo) return { ok: false, erro: "Usuário não encontrado." };

  const check = podeImpersonar(ator.id, {
    id: alvo.id,
    basePapel: alvo.papel.base,
    status: alvo.status,
  });
  if (!check.ok) return check;

  // Isolamento multi-CER: não simula perfil de usuário de outro CER.
  if (ator.cerId && alvo.cerId !== ator.cerId) {
    return { ok: false, erro: "Usuário não pertence ao seu CER." };
  }

  await db.auditoria.create({
    data: {
      cerId: ator.cerId,
      actorId: ator.id,
      action: "usuario.impersonar.iniciar",
      entityType: "usuario",
      entityId: alvo.id,
    },
  });

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function encerrarImpersonacao(): Promise<Resultado> {
  const atorReal = await getAtorReal();
  if (!atorReal.impersonando || !atorReal.usuarioSimuladoId) return { ok: true };

  const alvo = await db.usuario.findUnique({
    where: { id: atorReal.usuarioSimuladoId },
    select: { cerId: true },
  });

  await db.auditoria.create({
    data: {
      cerId: alvo?.cerId,
      actorId: atorReal.atorRealId,
      action: "usuario.impersonar.encerrar",
      entityType: "usuario",
      entityId: atorReal.usuarioSimuladoId,
    },
  });

  revalidatePath("/", "layout");
  return { ok: true };
}
