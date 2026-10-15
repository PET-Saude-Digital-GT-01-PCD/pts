"use server";

import { z } from "zod";
import type { Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import { requireAuth, recursosDoUsuario, requirePermissao } from "@/server/iam/session";
import { enfileirarOutbound } from "@/server/integrations/outbound/persistida";
import { podeAcessarCaso } from "@/server/shared/acesso-caso";

// Guia de contrarreferência (PRD M2). Emitida em dois pontos: NAO_ELEGIVEL da
// triagem (sem PTS — documento avulso) e encerramento por contrarreferência
// (com PTS). Append-only: nunca editada/apagada depois de criada.

const emitirSchema = z
  .object({
    pacienteId: z.string().uuid().optional(),
    ptsId: z.string().uuid().optional(),
    motivo: z.string().trim().min(3, "Motivo é obrigatório.").max(1000),
    planoCuidados: z.string().trim().max(2000).optional(),
    destinoUbs: z.string().trim().max(120).optional(),
  })
  .refine((d) => !!d.pacienteId || !!d.ptsId, {
    message: "Informe pacienteId ou ptsId.",
  });

export type ResultadoContrarreferencia =
  | { ok: true; contrarreferenciaId: string }
  | { ok: false; erro: string };

export async function emitirContrarreferencia(
  input: unknown,
): Promise<ResultadoContrarreferencia> {
  // Sem redirect aqui de propósito: esta action é chamada como passo
  // secundário depois de outra ação já ter mudado o estado (ex.: PTS
  // encerrado no #59) — um redirect nesse ponto tiraria o usuário da tela
  // sem mostrar o que aconteceu. Falha de permissão vira {ok:false}.
  const user = await requireAuth();
  const recursos = await recursosDoUsuario(user.papelId);
  if (!recursos.includes("triage.contrarreferencia.emissao")) {
    return { ok: false, erro: "Sem permissão para emitir contrarreferência." };
  }

  const parsed = emitirSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, erro: parsed.error.issues[0].message };
  }
  const dados = parsed.data;

  // Escopo antes da escrita (#69 / multi-CER): com PTS exige vínculo ao
  // caso; sem PTS (documento avulso do NAO_ELEGIVEL) exige que o paciente
  // pertença ao mesmo CER do ator.
  let pacienteId = dados.pacienteId ?? null;
  if (dados.ptsId) {
    if (!(await podeAcessarCaso(user.id, dados.ptsId))) {
      return { ok: false, erro: "Você não está vinculado a este caso." };
    }
    const pts = await db.pts.findUnique({
      where: { id: dados.ptsId },
      select: { pacienteId: true },
    });
    if (!pts) return { ok: false, erro: "PTS não encontrado." };
    pacienteId = pts.pacienteId;
  }
  if (!pacienteId) return { ok: false, erro: "Paciente não encontrado." };
  const alvoPacienteId: string = pacienteId;

  const paciente = await db.paciente.findUnique({
    where: { id: alvoPacienteId },
    select: { cerId: true },
  });
  if (!paciente) return { ok: false, erro: "Paciente não encontrado." };
  if (user.cerId && paciente.cerId !== user.cerId) {
    return { ok: false, erro: "Paciente não pertence ao seu CER." };
  }

  try {
    const contrarreferenciaId = await db.$transaction(async (tx) => {
      const guia = await tx.contrarreferencia.create({
        data: {
          pacienteId: alvoPacienteId,
          ptsId: dados.ptsId,
          motivo: dados.motivo,
          planoCuidadosJson: dados.planoCuidados
            ? ({ texto: dados.planoCuidados } as Prisma.InputJsonValue)
            : undefined,
          destinoUbs: dados.destinoUbs,
          emitidaPorId: user.id,
        },
      });

      // Envio real ao e-SUS PEC é Fase 2 (worker outbound).
      await enfileirarOutbound(tx, "REFERRAL", {
        contrarreferenciaId: guia.id,
        pacienteId: alvoPacienteId,
        ptsId: dados.ptsId ?? null,
        destinoUbs: dados.destinoUbs ?? null,
      });

      await tx.auditoria.create({
        data: {
          actorId: user.id,
          action: "contrarreferencia.emitir",
          entityType: "contrarreferencia",
          entityId: guia.id,
          afterJson: {
            pacienteId: alvoPacienteId,
            ptsId: dados.ptsId ?? null,
            destinoUbs: dados.destinoUbs ?? null,
          },
        },
      });

      return guia.id;
    });

    return { ok: true, contrarreferenciaId };
  } catch (e) {
    return {
      ok: false,
      erro: e instanceof Error ? e.message : "Erro ao emitir contrarreferência.",
    };
  }
}

export type ContrarreferenciaResumo = {
  id: string;
  motivo: string;
  destinoUbs: string | null;
  planoCuidadosJson: unknown;
  criadaEm: Date;
  emitidaPorNome: string;
  pacienteNome: string;
};

async function paraResumo(
  rows: {
    id: string;
    motivo: string;
    destinoUbs: string | null;
    planoCuidadosJson: unknown;
    criadaEm: Date;
    emitidaPor: { nome: string };
    paciente: { nome: string };
  }[],
): Promise<ContrarreferenciaResumo[]> {
  return rows.map((r) => ({
    id: r.id,
    motivo: r.motivo,
    destinoUbs: r.destinoUbs,
    planoCuidadosJson: r.planoCuidadosJson,
    criadaEm: r.criadaEm,
    emitidaPorNome: r.emitidaPor.nome,
    pacienteNome: r.paciente.nome,
  }));
}

/** Guias emitidas para um PTS específico (reimprimíveis no caso). */
export async function listarContrarreferenciasPts(
  ptsId: string,
): Promise<ContrarreferenciaResumo[]> {
  const user = await requireAuth();
  const recursos = await recursosDoUsuario(user.papelId);
  if (!recursos.includes("triage.triagem.ver")) return [];
  // Vínculo ao caso (#69): não vaza guias de caso alheio.
  if (!(await podeAcessarCaso(user.id, ptsId))) return [];

  const rows = await db.contrarreferencia.findMany({
    where: { ptsId },
    orderBy: { criadaEm: "desc" },
    select: {
      id: true,
      motivo: true,
      destinoUbs: true,
      planoCuidadosJson: true,
      criadaEm: true,
      emitidaPor: { select: { nome: true } },
      paciente: { select: { nome: true } },
    },
  });
  return paraResumo(rows);
}

/** Uma guia específica, para a tela de resumo imprimível. */
export async function buscarContrarreferencia(
  id: string,
): Promise<ContrarreferenciaResumo | null> {
  const user = await requirePermissao("triage.contrarreferencia.emissao");
  const row = await db.contrarreferencia.findUnique({
    where: { id },
    select: {
      id: true,
      ptsId: true,
      motivo: true,
      destinoUbs: true,
      planoCuidadosJson: true,
      criadaEm: true,
      emitidaPor: { select: { nome: true } },
      paciente: { select: { nome: true, cerId: true } },
    },
  });
  if (!row) return null;
  // Guia de caso exige vínculo; guia avulsa exige mesmo CER do ator.
  if (row.ptsId) {
    if (!(await podeAcessarCaso(user.id, row.ptsId))) return null;
  } else if (user.cerId && row.paciente.cerId !== user.cerId) {
    return null;
  }
  return (await paraResumo([row]))[0]!;
}
