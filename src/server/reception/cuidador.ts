"use server";

import { z } from "zod";
import { Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import { requirePermissao } from "@/server/iam/session";
import { zaritAlto } from "@/server/reception/zarit";

const cuidadorInputSchema = z.object({
  pacienteId: z.string().uuid(),
  nome: z.string().trim().min(3).max(120),
  parentesco: z.string().trim().min(2).max(60),
  idade: z.number().int().min(0).max(120).optional(),
  comorbidadesJson: z.record(z.unknown()).optional(),
  zaritScore: z.number().int().min(0).max(24).optional(),
  vulnerabilidadesJson: z.record(z.unknown()).optional(),
});

export type ResultadoCuidador =
  | { ok: true; cuidadorId: string; zaritAlto: boolean }
  | { ok: false; erro: string };

export async function registrarCuidador(input: unknown): Promise<ResultadoCuidador> {
  const user = await requirePermissao("recepcao.paciente.cadastrar");
  const parsed = cuidadorInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, erro: parsed.error.issues[0].message };
  }
  const dados = parsed.data;

  const paciente = await db.paciente.findUnique({
    where: { id: dados.pacienteId },
    select: { id: true, cerId: true },
  });
  if (!paciente) return { ok: false, erro: "Paciente não encontrado." };
  if (paciente.cerId !== user.cerId) {
    return { ok: false, erro: "Paciente fora do CER do usuário." };
  }

  const resultado = await db.$transaction(async (tx) => {
    const cuidador = await tx.cuidador.create({
      data: {
        pacienteId: paciente.id,
        nome: dados.nome,
        parentesco: dados.parentesco,
        idade: dados.idade,
        comorbidadesJson: dados.comorbidadesJson as Prisma.InputJsonValue | undefined,
        zaritScore: dados.zaritScore,
        vulnerabilidadesJson: dados.vulnerabilidadesJson as
          | Prisma.InputJsonValue
          | undefined,
      },
    });

    await tx.auditoria.create({
      data: {
        actorId: user.id,
        action: "cuidador.criar",
        entityType: "cuidador",
        entityId: cuidador.id,
        afterJson: {
          nome: cuidador.nome,
          pacienteId: cuidador.pacienteId,
          zaritScore: cuidador.zaritScore,
        },
      },
    });

    return cuidador;
  });

  return {
    ok: true,
    cuidadorId: resultado.id,
    zaritAlto: zaritAlto(resultado.zaritScore),
  };
}
