"use server";

import { z } from "zod";
import { Especialidade } from "@prisma/client";

import { db } from "@/lib/db";
import { requireAuth, recursosDoUsuario } from "@/server/iam/session";
import { podeAcessarCaso } from "@/server/shared/acesso-caso";
import { avaliacaoSoapSchema } from "@/server/clinical/soap-schema";

type Resultado =
  | { ok: true; avaliacaoId: string }
  | { ok: false; erro: string };

const uuid = z.string().uuid();

const criarAvaliacaoSoapSchema = z.object({
  ptsId: uuid,
  dadosJson: avaliacaoSoapSchema,
});

// OR de permissões (requirePermissao é AND). ponytail: helper local;
// extrair p/ session.ts quando um 3º contexto precisar.
async function exigirUmaDas(chaves: string[]) {
  const user = await requireAuth();
  const recursos = await recursosDoUsuario(user.papelId);
  if (!chaves.some((chave) => recursos.includes(chave))) {
    throw new Error("Sem permissão para esta ação.");
  }
  return user;
}

export async function criarAvaliacaoSoap(input: unknown): Promise<Resultado> {
  const parsed = criarAvaliacaoSoapSchema.safeParse(input);
  if (!parsed.success) return { ok: false, erro: "Dados inválidos." };
  const { ptsId, dadosJson } = parsed.data;

  let user;
  try {
    user = await exigirUmaDas(["clinical.soap.escrever"]);
  } catch {
    return { ok: false, erro: "Sem permissão para registrar avaliação SOAP." };
  }

  if (!(await podeAcessarCaso(user.id, ptsId))) {
    return { ok: false, erro: "Você não está vinculado a este caso." };
  }

  try {
    const avaliacaoId = await db.$transaction(async (tx) => {
      const pts = await tx.pts.findUnique({ where: { id: ptsId }, select: { id: true } });
      if (!pts) throw new Error("PTS não encontrado.");

      const avaliacao = await tx.avaliacao.create({
        data: {
          ptsId,
          especialidade: Especialidade.SOAP,
          dadosJson,
          avaliadorId: user.id,
          versao: 0,
        },
      });

      await tx.auditoria.create({
        data: {
          actorId: user.id,
          action: "clinical.soap.criar",
          entityType: "avaliacao",
          entityId: avaliacao.id,
          afterJson: {
            ptsId,
            especialidade: Especialidade.SOAP,
            versao: avaliacao.versao,
          },
        },
      });

      return avaliacao.id;
    });

    return { ok: true, avaliacaoId };
  } catch (e) {
    return {
      ok: false,
      erro: e instanceof Error ? e.message : "Erro ao registrar avaliação SOAP.",
    };
  }
}

export async function listarAvaliacoesSoap(
  ptsId: string,
): Promise<
  | {
      ok: true;
      avaliacoes: {
        id: string;
        dadosJson: unknown;
        versao: number;
        criadaEm: Date;
        avaliadorNome: string;
      }[];
    }
  | { ok: false; erro: string }
> {
  let user;
  try {
    user = await exigirUmaDas(["clinical.soap.ler"]);
  } catch {
    return { ok: false, erro: "Sem permissão para ler avaliações SOAP." };
  }

  if (!(await podeAcessarCaso(user.id, ptsId))) {
    return { ok: false, erro: "Você não está vinculado a este caso." };
  }

  const avaliacoes = await db.avaliacao.findMany({
    where: { ptsId, especialidade: Especialidade.SOAP },
    orderBy: { criadaEm: "desc" },
    select: {
      id: true,
      dadosJson: true,
      versao: true,
      criadaEm: true,
      avaliador: { select: { nome: true } },
    },
  });

  return {
    ok: true,
    avaliacoes: avaliacoes.map((a) => ({
      id: a.id,
      dadosJson: a.dadosJson,
      versao: a.versao,
      criadaEm: a.criadaEm,
      avaliadorNome: a.avaliador.nome,
    })),
  };
}
