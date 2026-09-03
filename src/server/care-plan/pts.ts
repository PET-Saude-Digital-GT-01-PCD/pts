"use server";

import { z } from "zod";
import { StatusPts, TipoEncerramento } from "@prisma/client";

import { db } from "@/lib/db";
import {
  exigirUmaDas,
} from "@/server/care-plan/acesso";
import {
  mensagemTransicaoInvalida,
  podeTransicionar,
} from "@/server/care-plan/maquina-status";
import { enfileirarOutbound } from "@/server/integrations/outbound/persistida";
import { notificarPtsAberto } from "@/server/integrations/notify/pts-aberto";

type Resultado =
  | { ok: true; ptsId: string }
  | { ok: false; erro: string; codigo?: number };

class ConflitoVersao extends Error {
  readonly codigo = 409;
}

const uuid = z.string().uuid();

const abrirPtsSchema = z.object({
  pacienteId: uuid,
  refProfissionalId: uuid.optional(),
});

const transicionarPtsSchema = z.object({
  ptsId: uuid,
  para: z.nativeEnum(StatusPts),
  motivo: z.string().trim().max(500).optional(),
  tipoEncerramento: z.nativeEnum(TipoEncerramento).optional(),
  version: z.number().int().min(0),
});

export async function abrirPts(input: unknown): Promise<Resultado> {
  const user = await exigirUmaDas([
    "recepcao.paciente.cadastrar",
    "triage.triagem.escrever",
  ]);

  const parsed = abrirPtsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, erro: "Dados inválidos." };

  const { pacienteId, refProfissionalId } = parsed.data;

  try {
    const resultado = await db.$transaction(async (tx) => {
      // ponytail: checagem-então-insere tem janela de corrida; unique parcial
      // no banco é o upgrade quando houver concorrência real de abertura.
      const ativoExistente = await tx.pts.findFirst({
        where: { pacienteId, status: { not: "FECHADO" } },
        select: { id: true },
      });
      if (ativoExistente) {
        throw new Error(
          "Paciente já possui um PTS ativo; encerre-o antes de abrir outro.",
        );
      }

      const paciente = await tx.paciente.findUnique({
        where: { id: pacienteId },
        select: { cerId: true, nome: true },
      });
      if (!paciente) throw new Error("Paciente não encontrado.");

      const pts = await tx.pts.create({
        data: {
          pacienteId,
          cerId: user.cerId ?? paciente.cerId,
          status: "EM_AVALIACAO",
          refProfissionalId,
          versao: 0,
        },
      });

      await tx.auditoria.create({
        data: {
          actorId: user.id,
          action: "pts.abrir",
          entityType: "pts",
          entityId: pts.id,
          afterJson: {
            pacienteId,
            status: pts.status,
            refProfissionalId,
            versao: pts.versao,
          },
        },
      });

      // Marcador de PTS ativo no e-SUS PEC (PRD M1) — envio real é Fase 2.
      await enfileirarOutbound(tx, "MARKER_ESUS", {
        ptsId: pts.id,
        pacienteId,
        status: pts.status,
      });

      return { ptsId: pts.id, pacienteNome: paciente.nome };
    });

    // Fora da transação: I/O de rede não trava a escrita clínica (ADR-0008).
    // notificarPtsAberto isola sua própria falha — nunca propaga aqui.
    await notificarPtsAberto({
      pacienteNome: resultado.pacienteNome,
      ptsId: resultado.ptsId,
    });

    return { ok: true, ptsId: resultado.ptsId };
  } catch (e) {
    return {
      ok: false,
      erro: e instanceof Error ? e.message : "Erro ao abrir o PTS.",
    };
  }
}

export async function transicionarStatusPts(input: unknown): Promise<Resultado> {
  const parsed = transicionarPtsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, erro: "Dados inválidos." };

  const { ptsId, para, motivo, tipoEncerramento, version } = parsed.data;

  const user = await exigirUmaDas([
    para === "FECHADO" ? "care-plan.pts.encerrar" : "care-plan.pts.revisar",
  ]);

  const pts = await db.pts.findUnique({ where: { id: ptsId } });
  if (!pts) return { ok: false, erro: "PTS não encontrado." };

  if (!podeTransicionar(pts.status, para)) {
    return {
      ok: false,
      erro: mensagemTransicaoInvalida(pts.status, para),
    };
  }

  if (para === "FECHADO" && !motivo) {
    return {
      ok: false,
      erro: "Encerramento exige motivo informado.",
    };
  }

  if (para === "FECHADO" && !tipoEncerramento) {
    return {
      ok: false,
      erro: "Encerramento exige o tipo (alta, contrarreferência ou descontinuação).",
    };
  }

  try {
    await db.$transaction(async (tx) => {
      // Lock otimista: updateMany condicionado à versão conhecida.
      const atualizado = await tx.pts.updateMany({
        where: { id: ptsId, versao: version },
        data: {
          status: para,
          versao: version + 1,
          ...(para === "FECHADO"
            ? {
                motivoEncerramento: motivo,
                tipoEncerramento,
                encerramentoEm: new Date(),
              }
            : {}),
        },
      });
      if (atualizado.count === 0) {
        throw new ConflitoVersao(
          "Conflito de versão: o PTS foi alterado por outra pessoa. Recarregue a página.",
        );
      }

      await tx.auditoria.create({
        data: {
          actorId: user.id,
          action: "pts.transicionar",
          entityType: "pts",
          entityId: ptsId,
          beforeJson: { status: pts.status, versao: pts.versao },
          afterJson: {
            status: para,
            versao: version + 1,
            ...(motivo ? { motivo } : {}),
            ...(tipoEncerramento ? { tipoEncerramento } : {}),
          },
        },
      });
    });

    return { ok: true, ptsId };
  } catch (e) {
    if (e instanceof ConflitoVersao) {
      return { ok: false, erro: e.message, codigo: e.codigo };
    }
    return {
      ok: false,
      erro: e instanceof Error ? e.message : "Erro ao transicionar o PTS.",
    };
  }
}
