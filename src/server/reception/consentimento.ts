"use server";

import { z } from "zod";
import { Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import { requirePermissao } from "@/server/iam/session";

const consentimentoInputSchema = z.object({
  pacienteId: z.string().uuid(),
  termoVersao: z.string().trim().min(1).max(20),
  canal: z.enum(["TABLET", "WHATSAPP", "GOVBR"]),
  // ponytail: assinatura digital avançada é Fase 2 — string placeholder
  assinaturaRef: z.string().trim().max(255).optional(),
});

export type ResultadoConsentimento =
  | { ok: true; consentimentoId: string }
  | { ok: false; erro: string };

async function pacienteDoCER(pacienteId: string, cerId: string | null) {
  const paciente = await db.paciente.findUnique({
    where: { id: pacienteId },
    select: { id: true, cerId: true },
  });
  if (!paciente) return null;
  return paciente.cerId === cerId ? paciente : "fora-do-cer" as const;
}

export async function registrarConsentimento(
  input: unknown,
): Promise<ResultadoConsentimento> {
  const user = await requirePermissao("recepcao.consentimento.registrar");
  const parsed = consentimentoInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, erro: parsed.error.issues[0].message };
  }
  const dados = parsed.data;

  const paciente = await pacienteDoCER(dados.pacienteId, user.cerId);
  if (paciente === null) return { ok: false, erro: "Paciente não encontrado." };
  if (paciente === "fora-do-cer") {
    return { ok: false, erro: "Paciente fora do CER do usuário." };
  }

  return db.$transaction(async (tx) => {
    const consentimento = await tx.consentimento.create({
      data: {
        pacienteId: paciente.id,
        termoVersao: dados.termoVersao,
        canal: dados.canal,
        assinaturaRef: dados.assinaturaRef,
      },
    });

    await tx.auditoria.create({
      data: {
        actorId: user.id,
        action: "consentimento.registrar",
        entityType: "consentimento",
        entityId: consentimento.id,
        afterJson: {
          pacienteId: consentimento.pacienteId,
          termoVersao: consentimento.termoVersao,
          canal: consentimento.canal,
        },
      },
    });

    return { ok: true as const, consentimentoId: consentimento.id };
  });
}

const revogacaoInputSchema = z.object({
  consentimentoId: z.string().uuid(),
});

// Append-only: revogação cria novo registro com revogadoEm; o original nunca muda.
export async function revogarConsentimento(
  input: unknown,
): Promise<ResultadoConsentimento> {
  const user = await requirePermissao("recepcao.consentimento.registrar");
  const parsed = revogacaoInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, erro: parsed.error.issues[0].message };
  }

  const anterior = await db.consentimento.findUnique({
    where: { id: parsed.data.consentimentoId },
    select: {
      id: true,
      pacienteId: true,
      termoVersao: true,
      canal: true,
      revogadoEm: true,
    },
  });
  if (!anterior) return { ok: false, erro: "Consentimento não encontrado." };
  if (anterior.revogadoEm) {
    return { ok: false, erro: "Consentimento já revogado." };
  }

  const paciente = await pacienteDoCER(anterior.pacienteId, user.cerId);
  if (paciente === null || paciente === "fora-do-cer") {
    return { ok: false, erro: "Paciente fora do CER do usuário." };
  }

  return db.$transaction(async (tx) => {
    const revogacao = await tx.consentimento.create({
      data: {
        pacienteId: anterior.pacienteId,
        termoVersao: anterior.termoVersao,
        canal: anterior.canal,
        revogadoEm: new Date(),
      },
    });

    await tx.auditoria.create({
      data: {
        actorId: user.id,
        action: "consentimento.revogar",
        entityType: "consentimento",
        entityId: revogacao.id,
        beforeJson: {
          consentimentoAnteriorId: anterior.id,
          termoVersao: anterior.termoVersao,
          canal: anterior.canal,
        } as Prisma.InputJsonValue,
      },
    });

    return { ok: true as const, consentimentoId: revogacao.id };
  });
}
