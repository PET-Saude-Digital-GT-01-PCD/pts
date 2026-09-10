"use server";

import { z } from "zod";
import { Especialidade } from "@prisma/client";

import { db } from "@/lib/db";
import {
  requireAuth,
  recursosDoUsuario,
  type SessaoUsuario,
} from "@/server/iam/session";
import { assertPtsMutavel } from "@/server/care-plan/acesso";
import { podeAcessarCaso } from "@/server/shared/acesso-caso";
import {
  marcarCif,
  especialidadesDoUsuario,
  type EspecialidadeCif,
} from "@/server/clinical/cif";

// Avaliação por especialidade (RF-4.2): checklist visual → códigos CIF gerados
// em background, zero digitação de código. Auditoria + bump de versão do PTS
// na mesma transação.

type Resultado =
  | { ok: true; avaliacaoId: string; cif: string[] }
  | { ok: false; erro: string };

const uuid = z.string().uuid();

const checklistFisio = z
  .object({
    mobilidade: z.boolean().optional(),
    forca: z.boolean().optional(),
    fatoresAmbientais: z.boolean().optional(),
    objetivosFuncionais: z.boolean().optional(),
  })
  .strip();

const checklistTo = z
  .object({
    alimentacao: z.boolean().optional(),
    higiene: z.boolean().optional(),
    vestuario: z.boolean().optional(),
    ortesesAdaptacoes: z.boolean().optional(),
  })
  .strip();

const criarSchema = z.discriminatedUnion("especialidade", [
  z.object({
    especialidade: z.literal("FISIO"),
    ptsId: uuid,
    dadosJson: checklistFisio,
  }),
  z.object({
    especialidade: z.literal("TO"),
    ptsId: uuid,
    dadosJson: checklistTo,
  }),
]);

// OR de permissões (requirePermissao é AND).
async function exigirUmaDas(
  chaves: string[],
): Promise<SessaoUsuario> {
  const user = await requireAuth();
  const recursos = await recursosDoUsuario(user.papelId);
  if (!chaves.some((chave) => recursos.includes(chave))) {
    throw new Error("Sem permissão para esta ação.");
  }
  return user;
}

export async function criarAvaliacaoEspecialidade(
  input: unknown,
): Promise<Resultado> {
  const parsed = criarSchema.safeParse(input);
  if (!parsed.success) return { ok: false, erro: "Dados inválidos." };
  const { ptsId, dadosJson } = parsed.data;
  const especialidade = parsed.data.especialidade as EspecialidadeCif;

  let user: SessaoUsuario;
  try {
    user = await exigirUmaDas(["clinical.avaliacao.escrever"]);
  } catch {
    return {
      ok: false,
      erro: `Sem permissão para registrar avaliação ${especialidade}.`,
    };
  }

  if (!(await podeAcessarCaso(user.id, ptsId))) {
    return { ok: false, erro: "Você não está vinculado a este caso." };
  }

  // códigos CIF derivados em background do preenchimento do checklist
  const cif = marcarCif(especialidade, dadosJson);

  try {
    const avaliacaoId = await db.$transaction(async (tx) => {
      await assertPtsMutavel(ptsId, tx);

      // pts.versao é o lock otimista do PTS (re-triagem, transição de
      // status); criar uma avaliação não muda a row do PTS nem é checada
      // contra essa versão em nenhum fluxo — bumpá-la aqui só gerava
      // conflitos 409 falsos em re-triagem concorrente. Uniformizado com
      // soap.ts, que nunca bumpou (auditoria #58).
      const avaliacao = await tx.avaliacao.create({
        data: {
          ptsId,
          especialidade: Especialidade[especialidade],
          dadosJson,
          escoresJson: { cif },
          avaliadorId: user.id,
          versao: 0,
        },
      });

      await tx.auditoria.create({
        data: {
          actorId: user.id,
          action: "clinical.avaliacao.criar",
          entityType: "avaliacao",
          entityId: avaliacao.id,
          afterJson: { ptsId, especialidade, cif, versao: avaliacao.versao },
        },
      });

      return avaliacao.id;
    });

    return { ok: true, avaliacaoId, cif };
  } catch (e) {
    return {
      ok: false,
      erro:
        e instanceof Error ? e.message : "Erro ao registrar avaliação.",
    };
  }
}

export type AvaliacaoEspecialidade = {
  id: string;
  especialidade: string;
  dadosJson: unknown;
  escoresJson: unknown;
  versao: number;
  criadaEm: Date;
  avaliadorNome: string;
};

export async function listarAvaliacoesEspecialidade(ptsId: string) {
  let user: SessaoUsuario;
  try {
    user = await exigirUmaDas(["clinical.avaliacao.ler"]);
  } catch {
    return { ok: false as const, erro: "Sem permissão para ler avaliações." };
  }

  if (!(await podeAcessarCaso(user.id, ptsId))) {
    return { ok: false as const, erro: "Você não está vinculado a este caso." };
  }

  const escopos = especialidadesDoUsuario(user.categoria);
  if (escopos.length === 0) return { ok: true as const, avaliacoes: [] };

  const avaliacoes = await db.avaliacao.findMany({
    where: { ptsId, especialidade: { in: escopos } },
    orderBy: { criadaEm: "desc" },
    select: {
      id: true,
      especialidade: true,
      dadosJson: true,
      escoresJson: true,
      versao: true,
      criadaEm: true,
      avaliador: { select: { nome: true } },
    },
  });

  return {
    ok: true as const,
    avaliacoes: avaliacoes.map((a) => ({
      ...a,
      avaliadorNome: a.avaliador.nome,
    })),
  };
}
