"use server";

import { z } from "zod";
import { Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import { requirePermissao } from "@/server/iam/session";
import { soDigitos, validarCns, validarCpf } from "@/server/reception/documentos";

const pacienteInputSchema = z.object({
  nome: z.string().trim().min(3, "Nome muito curto.").max(120),
  cpf: z
    .string()
    .transform(soDigitos)
    .refine((cpf) => cpf === "" || validarCpf(cpf), "CPF inválido.")
    .optional(),
  cns: z
    .string()
    .transform(soDigitos)
    .refine((cns) => cns === "" || validarCns(cns), "CNS inválido.")
    .optional(),
  dtnasc: z.coerce.date({ message: "Data de nascimento inválida." }),
  sexo: z.enum(["MASCULINO", "FEMININO", "OUTRO"]),
  enderecoJson: z.record(z.unknown()).optional(),
  ubsId: z.string().uuid().optional(),
});

export type ResultadoPaciente =
  | { ok: true; pacienteId: string }
  | { ok: false; erro: string };

export async function criarPaciente(input: unknown): Promise<ResultadoPaciente> {
  const user = await requirePermissao("recepcao.paciente.cadastrar");
  const cerId = user.cerId;
  if (!cerId) return { ok: false, erro: "Usuário sem CER vinculado." };

  const parsed = pacienteInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, erro: parsed.error.issues[0].message };
  }
  const dados = parsed.data;

  if (!dados.cpf && !dados.cns) {
    return { ok: false, erro: "Informe CPF ou CNS." };
  }

  const duplicidade = await buscarDuplicidade({
    cpf: dados.cpf || undefined,
    cns: dados.cns || undefined,
  });
  if (duplicidade) {
    return {
      ok: false,
      erro: `Documento já cadastrado para ${duplicidade.nome}.`,
    };
  }

  try {
    return await db.$transaction(async (tx) => {
      const paciente = await tx.paciente.create({
        data: {
          cerId: cerId,
          nome: dados.nome,
          cpf: dados.cpf || undefined,
          cns: dados.cns || undefined,
          dtnasc: dados.dtnasc,
          sexo: dados.sexo,
          enderecoJson: dados.enderecoJson
            ? (dados.enderecoJson as Prisma.InputJsonValue)
            : undefined,
          ubsId: dados.ubsId,
        },
      });

      await tx.auditoria.create({
        data: {
          actorId: user.id,
          action: "paciente.criar",
          entityType: "paciente",
          entityId: paciente.id,
          afterJson: { nome: paciente.nome, cpf: paciente.cpf, cns: paciente.cns },
        },
      });

      return { ok: true as const, pacienteId: paciente.id };
    });
  } catch (erro) {
    // ponytail: corrida entre checagem e create cai no unique do banco
    if (
      erro instanceof Prisma.PrismaClientKnownRequestError &&
      erro.code === "P2002"
    ) {
      return { ok: false, erro: "Documento já cadastrado." };
    }
    throw erro;
  }
}

async function buscarDuplicidade(
  where: { cpf?: string; cns?: string },
): Promise<{ id: string; nome: string } | null> {
  const ou = [
    where.cpf ? { cpf: where.cpf } : null,
    where.cns ? { cns: where.cns } : null,
  ].filter((c): c is NonNullable<typeof c> => c !== null);
  if (ou.length === 0) return null;
  return db.paciente.findFirst({ where: { OR: ou }, select: { id: true, nome: true } });
}

export type PacienteBuscado = {
  id: string;
  nome: string;
  cpf: string | null;
  cns: string | null;
};

export async function buscarPacientePorDocumento(
  entrada: unknown,
): Promise<PacienteBuscado | null> {
  await requirePermissao("recepcao.paciente.ver");
  const doc = soDigitos(typeof entrada === "string" ? entrada : "");
  if (doc.length !== 11 && doc.length !== 15) return null;

  return db.paciente.findFirst({
    where: doc.length === 11 ? { cpf: doc } : { cns: doc },
    select: { id: true, nome: true, cpf: true, cns: true },
  });
}
