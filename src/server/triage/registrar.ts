"use server";

import { z } from "zod";
import { Semaforo, type Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import { requirePermissao } from "@/server/iam/session";
import {
  calcularSemaforo,
  type EntradaSemaforo,
} from "@/server/triage/semaforo";
import {
  elegibilidadePorEscopo,
  type EscopoCER,
} from "@/server/triage/elegibilidade";
import { abrirPts } from "@/server/care-plan/pts";

const slider = z.number().int().min(0).max(100);

const eixosSchema = z.object({
  bandeiras: z.object({
    motivoAgudo: z.boolean(),
    altaHospitalarRecente: z.boolean(),
    posCirurgico: z.boolean(),
  }),
  funcional: z.tuple([slider, slider, slider, slider]),
  social: z.object({
    cuidadorPresente: z.boolean(),
    zaritScore: z.number().int().min(0).max(24),
    vulnerabilidades: z.number().int().min(0),
  }),
});

const criarTriagemSchema = z
  .object({
    pacienteId: z.string().uuid().optional(),
    ptsId: z.string().uuid().optional(),
    /** versão conhecida do PTS — obrigatória em re-triagem (lock otimista) */
    version: z.number().int().min(0).optional(),
    cid: z.string().trim().min(2).max(8),
    motivo: z.string().trim().min(3).max(500),
    /** exigida quando a elegibilidade resulta em REVISAO_MANUAL */
    justificativa: z.string().trim().max(500).optional(),
    eixos: eixosSchema,
  })
  .refine((d) => !!d.pacienteId !== !!d.ptsId, {
    message: "Informe pacienteId (nascimento) ou ptsId (re-triagem), não ambos.",
  });

export type ResultadoTriagem =
  | {
      ok: true;
      ptsId: string;
      triagemId: string;
      classificacao: Semaforo;
      resultadoElegibilidade: string;
    }
  | { ok: false; codigo: "NAO_ELEGIVEL"; justificativa: string }
  | { ok: false; erro: string; codigo?: number };

export async function criarTriagem(input: unknown): Promise<ResultadoTriagem> {
  const user = await requirePermissao("triage.triagem.escrever");
  const parsed = criarTriagemSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, erro: parsed.error.issues[0].message };
  }
  const dados = parsed.data;

  // Funções puras ANTES da transação (determinísticas, sem I/O).
  const entrada: EntradaSemaforo = dados.eixos;
  const { classificacao, pontuacaoJson } = calcularSemaforo(entrada);

  if (!user.cerId) return { ok: false, erro: "Usuário sem CER vinculado." };
  const cer = await db.cer.findUnique({
    where: { id: user.cerId },
    select: { escopos: true },
  });
  const escopos = (cer?.escopos ?? []) as EscopoCER[];
  const elegibilidade = elegibilidadePorEscopo(
    dados.cid.toUpperCase(),
    dados.motivo,
    escopos,
  );

  if (elegibilidade.resultado === "NAO_ELEGIVEL") {
    return {
      ok: false,
      codigo: "NAO_ELEGIVEL",
      justificativa:
        elegibilidade.justificativa ??
        "Paciente não elegível para este CER. Retorne à APS.",
    };
  }

  if (
    elegibilidade.resultado === "REVISAO_MANUAL" &&
    !dados.justificativa
  ) {
    return {
      ok: false,
      erro:
        "Elegibilidade exige decisão clínica: informe a justificativa do triador.",
    };
  }

  let ptsId: string;

  if (dados.pacienteId) {
    // Nascimento do PTS (S2 abrirPts tem tx própria + auditoria).
    // ponytail: abrirPts e triagem não compartilham transação (tx aninhada
    // não suportada); falha depois do abrirPts se recupera via re-triagem
    // com o ptsId criado.
    const nascimento = await abrirPts({ pacienteId: dados.pacienteId });
    if (!nascimento.ok) return { ok: false, erro: nascimento.erro };
    ptsId = nascimento.ptsId;
  } else if (dados.ptsId) {
    ptsId = dados.ptsId;
  } else {
    return { ok: false, erro: "Informe pacienteId ou ptsId." };
  }

  try {
    const triagemId = await db.$transaction(async (tx) => {
      if (dados.ptsId) {
        // Re-triagem: lock otimista na versão do PTS.
        const atualizado = await tx.pts.updateMany({
          where: { id: ptsId, versao: dados.version },
          data: { versao: (dados.version ?? 0) + 1 },
        });
        if (atualizado.count === 0) {
          throw new Error("409: conflito de versão. Recarregue a página.");
        }
      }

      const triagem = await tx.triagem.create({
        data: {
          ptsId,
          motivo: dados.motivo,
          eixosJson: dados.eixos as unknown as Prisma.InputJsonValue,
          pontuacaoJson: pontuacaoJson as unknown as Prisma.InputJsonValue,
          classificacao,
          resultadoElegibilidade: elegibilidade.resultado,
          justificativa: dados.justificativa,
        },
      });

      await tx.auditoria.create({
        data: {
          actorId: user.id,
          action: "triagem.criar",
          entityType: "triagem",
          entityId: triagem.id,
          afterJson: {
            ptsId,
            classificacao,
            resultadoElegibilidade: elegibilidade.resultado,
          },
        },
      });

      return triagem.id;
    });

    return {
      ok: true,
      ptsId,
      triagemId,
      classificacao,
      resultadoElegibilidade: elegibilidade.resultado,
    };
  } catch (e) {
    return {
      ok: false,
      erro: e instanceof Error ? e.message : "Erro ao registrar triagem.",
    };
  }
}

const ajusteSchema = z.object({
  triagemId: z.string().uuid(),
  para: z.nativeEnum(Semaforo),
  motivo: z.string().trim().min(1, "Motivo é obrigatório.").max(500),
});

export type ResultadoAjuste =
  | { ok: true; ajusteId: string; vigente: Semaforo }
  | { ok: false; erro: string };

/** Append-only: grava AjusteClassificacao; nunca edita a triagem original. */
export async function ajustarClassificacao(
  input: unknown,
): Promise<ResultadoAjuste> {
  const user = await requirePermissao("triage.semaforo.ajustar");
  const parsed = ajusteSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, erro: parsed.error.issues[0].message };
  }
  const { triagemId, para, motivo } = parsed.data;

  const triagem = await db.triagem.findUnique({
    where: { id: triagemId },
    select: {
      classificacao: true,
      ajustes: { orderBy: { data: "desc" }, take: 1, select: { para: true } },
    },
  });
  if (!triagem) return { ok: false, erro: "Triagem não encontrada." };

  const de =
    triagem.ajustes[0]?.para ?? triagem.classificacao;

  try {
    return await db.$transaction(async (tx) => {
      const ajuste = await tx.ajusteClassificacao.create({
        data: { triagemId, de, para, motivo, ajustadoPorId: user.id },
      });

      await tx.auditoria.create({
        data: {
          actorId: user.id,
          action: "triagem.ajustar",
          entityType: "ajuste_classificacao",
          entityId: ajuste.id,
          beforeJson: { de },
          afterJson: { para, motivo, triagemId },
        },
      });

      return { ok: true as const, ajusteId: ajuste.id, vigente: para };
    });
  } catch {
    return { ok: false, erro: "Erro ao registrar ajuste." };
  }
}
