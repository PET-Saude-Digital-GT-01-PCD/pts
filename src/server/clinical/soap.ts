"use server";

import { z } from "zod";
import { Especialidade } from "@prisma/client";

import { db } from "@/lib/db";
import { requireAuth, recursosDoUsuario } from "@/server/iam/session";
import { assertPtsMutavel } from "@/server/care-plan/acesso";
import { avaliacaoSoapSchema } from "@/server/clinical/soap-schema";
import { calcularAshworth, somaGlasgow } from "@/server/clinical/escalas";

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

  // score automático das escalas clínicas do bloco O (#66)
  const ashworth = dadosJson.escalasObjetivo?.ashworth
    ? calcularAshworth(dadosJson.escalasObjetivo.ashworth)
    : null;
  const glasgow = dadosJson.escalasObjetivo?.glasgow
    ? somaGlasgow(dadosJson.escalasObjetivo.glasgow)
    : null;
  const temEscala = (ashworth && ashworth.gruposAvaliados > 0) || (glasgow && glasgow.completo);

  try {
    const avaliacaoId = await db.$transaction(async (tx) => {
      await assertPtsMutavel(ptsId, tx);

      const avaliacao = await tx.avaliacao.create({
        data: {
          ptsId,
          especialidade: Especialidade.SOAP,
          dadosJson,
          escoresJson: temEscala ? { ashworth, glasgow } : undefined,
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
        escoresJson: unknown;
        versao: number;
        criadaEm: Date;
        avaliadorNome: string;
      }[];
    }
  | { ok: false; erro: string }
> {
  try {
    await exigirUmaDas(["clinical.soap.ler"]);
  } catch {
    return { ok: false, erro: "Sem permissão para ler avaliações SOAP." };
  }

  const avaliacoes = await db.avaliacao.findMany({
    where: { ptsId, especialidade: Especialidade.SOAP },
    orderBy: { criadaEm: "desc" },
    select: {
      id: true,
      dadosJson: true,
      escoresJson: true,
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
      escoresJson: a.escoresJson,
      versao: a.versao,
      criadaEm: a.criadaEm,
      avaliadorNome: a.avaliador.nome,
    })),
  };
}
