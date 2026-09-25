import type { StatusMeta } from "@prisma/client";

import { db } from "@/lib/db";
import {
  LABEL_STATUS_META_ACESSIVEL,
  montarPercurso,
  type EtapaPercurso,
} from "@/server/care-plan/portal-formatacao";
import { hashCodigo } from "@/server/care-plan/portal-cidadao";

// Leitura do portal do cidadão pelo link (ADR-0012): rota pública, sem sessão
// e sem conta — o código no fim da URL é a credencial. Este arquivo não é
// "use server" de propósito: é leitura do servidor chamada por server
// component, não uma action.

export type MetaPortal = {
  id: string;
  descAcessivel: string;
  statusLabel: string;
  status: StatusMeta;
};

export type PortalCidadaoView = {
  pacienteNome: string;
  etapas: EtapaPercurso[];
  metas: MetaPortal[];
};

export type EstadoLinkCidadao = "ATIVO" | "REVOGADO" | "EXPIRADO" | "INVALIDO";

export type ResultadoPortalCidadao = {
  estado: EstadoLinkCidadao;
  view: PortalCidadaoView | null;
};

export type InfoAcessoCidadao = {
  existe: boolean;
  valido: boolean;
  criadoEm: Date | null;
  expiraEm: Date | null;
  ultimoAcessoEm: Date | null;
  totalAcessos: number;
};

export function acessoCidadaoVazio(): InfoAcessoCidadao {
  return {
    existe: false,
    valido: false,
    criadoEm: null,
    expiraEm: null,
    ultimoAcessoEm: null,
    totalAcessos: 0,
  };
}

/**
 * Projeção mínima do PTS em linguagem acessível: nome, percurso e metas.
 * Nunca SOAP, mural, avaliações ou qualquer dado de outro paciente — o mesmo
 * recorte usado pela visão da equipe em /portal/[ptsId].
 */
export async function carregarPortalDoPts(
  ptsId: string,
): Promise<PortalCidadaoView | null> {
  const pts = await db.pts.findUnique({
    where: { id: ptsId },
    select: {
      status: true,
      paciente: { select: { nome: true } },
      metas: {
        orderBy: [{ status: "asc" }, { prazo: "asc" }],
        select: { id: true, descAcessivel: true, status: true },
      },
    },
  });

  if (!pts) return null;

  return {
    pacienteNome: pts.paciente.nome,
    etapas: montarPercurso(pts.status),
    metas: pts.metas.map((m) => ({
      id: m.id,
      descAcessivel: m.descAcessivel,
      status: m.status,
      statusLabel: LABEL_STATUS_META_ACESSIVEL[m.status],
    })),
  };
}

/**
 * Entrada do cidadão pelo link. Estados distintos para a página explicar o
 * que aconteceu (inexistente, revogado, expirado) em vez de um 404 cru.
 */
export async function buscarPortalPorCodigo(
  codigo: string,
): Promise<ResultadoPortalCidadao> {
  const acesso = await db.acessoCidadao.findUnique({
    where: { codigoHash: hashCodigo(codigo) },
    select: { id: true, ptsId: true, expiraEm: true, revogadoEm: true },
  });

  if (!acesso) return { estado: "INVALIDO", view: null };
  if (acesso.revogadoEm) return { estado: "REVOGADO", view: null };
  if (acesso.expiraEm.getTime() <= Date.now()) return { estado: "EXPIRADO", view: null };

  const view = await carregarPortalDoPts(acesso.ptsId);
  if (!view) return { estado: "INVALIDO", view: null };

  await registrarAcesso(acesso.id);
  return { estado: "ATIVO", view };
}

async function registrarAcesso(acessoCidadaoId: string): Promise<void> {
  try {
    await db.$transaction([
      db.acessoCidadaoLog.create({ data: { acessoCidadaoId } }),
      db.acessoCidadao.update({
        where: { id: acessoCidadaoId },
        data: { ultimoAcessoEm: new Date(), totalAcessos: { increment: 1 } },
      }),
    ]);
  } catch (erro) {
    // ADR-0008: falhar ao registrar o instante do acesso não pode impedir o
    // cidadão de ver o próprio PTS.
    console.error("Falha ao registrar acesso do cidadão ao portal:", erro);
  }
}
