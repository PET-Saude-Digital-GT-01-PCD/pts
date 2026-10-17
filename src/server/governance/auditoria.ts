"use server";

import type { ActorTipo, Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import { requirePermissao } from "@/server/iam/session";
import { resumirJson } from "@/server/governance/auditoria-resumo";

// Viewer da trilha de auditoria (#71, ADR-0002): contexto novo — governance
// nasce aqui. Leitura só; Auditoria é append-only em todos os contextos.
// Gestor consulta metadados (actor, ação, entidade, motivo, before/after
// resumidos), nunca o conteúdo clínico completo.

const TAMANHO_PAGINA = 25;

export type FiltroAuditoria = {
  entityType?: string;
  entityId?: string;
  actorEmail?: string;
  actorTipo?: ActorTipo;
  action?: string;
  desde?: Date;
  ate?: Date;
  cursor?: string;
};

export type EventoAuditoria = {
  id: string;
  actorNome: string;
  actorEmail: string | null;
  actorTipo: ActorTipo;
  action: string;
  entityType: string;
  entityId: string;
  motivo: string | null;
  beforeResumo: string | null;
  afterResumo: string | null;
  criadaEm: Date;
};

export type PaginaAuditoria = {
  eventos: EventoAuditoria[];
  proximoCursor: string | null;
};

export async function listarAuditoria(
  filtro: FiltroAuditoria,
): Promise<PaginaAuditoria> {
  const user = await requirePermissao("governanca.auditoria.ver");

  const temIntervalo = Boolean(filtro.desde || filtro.ate);
  const where: Prisma.AuditoriaWhereInput = {
    // Escopo multi-CER: a trilha é por unidade (linhas SISTEMA sem CER ficam
    // fora — leitura fail-closed).
    cerId: user.cerId ?? undefined,
    entityType: filtro.entityType || undefined,
    entityId: filtro.entityId || undefined,
    actorTipo: filtro.actorTipo || undefined,
    action: filtro.action ? { contains: filtro.action } : undefined,
    actor: filtro.actorEmail ? { email: { contains: filtro.actorEmail } } : undefined,
    criadaEm: temIntervalo ? { gte: filtro.desde, lte: filtro.ate } : undefined,
  };

  const linhas = await db.auditoria.findMany({
    where,
    orderBy: [{ criadaEm: "desc" }, { id: "desc" }],
    take: TAMANHO_PAGINA + 1,
    ...(filtro.cursor ? { cursor: { id: filtro.cursor }, skip: 1 } : {}),
    select: {
      id: true,
      action: true,
      actorTipo: true,
      actorPacienteId: true,
      entityType: true,
      entityId: true,
      motivo: true,
      beforeJson: true,
      afterJson: true,
      criadaEm: true,
      actor: { select: { nome: true, email: true } },
    },
  });

  const temMais = linhas.length > TAMANHO_PAGINA;
  const pagina = temMais ? linhas.slice(0, TAMANHO_PAGINA) : linhas;

  // O ator CIDADAO não tem FK de Usuario; resolve o nome do paciente na
  // trilha sem expor nada clínico (só o nome, como já ocorre com a equipe).
  const idsPacientes = [
    ...new Set(
      pagina
        .map((e) => e.actorPacienteId)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const pacientes = idsPacientes.length
    ? await db.paciente.findMany({
        where: { id: { in: idsPacientes } },
        select: { id: true, nome: true },
      })
    : [];
  const nomePorPaciente = new Map(pacientes.map((p) => [p.id, p.nome]));

  return {
    eventos: pagina.map((e): EventoAuditoria => {
      let actorNome: string;
      let actorEmail: string | null = null;
      if (e.actor) {
        actorNome = e.actor.nome;
        actorEmail = e.actor.email;
      } else if (e.actorTipo === "CIDADAO") {
        const nome = e.actorPacienteId
          ? nomePorPaciente.get(e.actorPacienteId)
          : null;
        actorNome = nome ? `Cidadão — ${nome}` : "Cidadão";
      } else {
        actorNome = "Sistema";
      }
      return {
        id: e.id,
        actorNome,
        actorEmail,
        actorTipo: e.actorTipo,
        action: e.action,
        entityType: e.entityType,
        entityId: e.entityId,
        motivo: e.motivo,
        beforeResumo: resumirJson(e.beforeJson),
        afterResumo: resumirJson(e.afterJson),
        criadaEm: e.criadaEm,
      };
    }),
    proximoCursor: temMais ? (pagina[pagina.length - 1]?.id ?? null) : null,
  };
}

export async function listarTiposEntidade(): Promise<string[]> {
  const user = await requirePermissao("governanca.auditoria.ver");
  const grupos = await db.auditoria.groupBy({
    by: ["entityType"],
    where: { cerId: user.cerId ?? undefined },
    orderBy: { entityType: "asc" },
  });
  return grupos.map((g) => g.entityType);
}
