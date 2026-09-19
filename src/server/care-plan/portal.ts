"use server";

import { notFound, redirect } from "next/navigation";
import type { StatusMeta } from "@prisma/client";

import { db } from "@/lib/db";
import { exigirUmaDasOuRedirect } from "@/server/care-plan/acesso";
import { avaliarVinculoCaso } from "@/server/shared/acesso-caso";
import {
  montarPercurso,
  LABEL_STATUS_META_ACESSIVEL,
  type EtapaPercurso,
} from "@/server/care-plan/portal-formatacao";

// Portal do cidadão (#73): visão em linguagem acessível do percurso e das
// metas do PTS. ponytail: autenticação própria do cidadão (link mágico /
// código de acesso) depende de decisão de arquitetura ainda não tomada —
// por ora esta rota reaproveita a sessão da equipe (mesmo OR de permissão
// da página do caso), servindo como protótipo da experiência final e como
// ferramenta de conferência para a equipe. Consentimento e pré-chegada do
// cuidador pelo portal ficam fora deste escopo reduzido.

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

export async function buscarPortalCidadao(
  ptsId: string,
): Promise<PortalCidadaoView> {
  const usuario = await exigirUmaDasOuRedirect([
    "care-plan.meta.ler",
    "clinical.soap.ler",
    "triage.triagem.ver",
  ]);

  const pts = await db.pts.findUnique({
    where: { id: ptsId },
    select: {
      status: true,
      refProfissionalId: true,
      equipePts: { select: { usuarioId: true } },
      paciente: { select: { nome: true } },
      metas: {
        orderBy: [{ status: "asc" }, { prazo: "asc" }],
        select: { id: true, descAcessivel: true, status: true },
      },
    },
  });

  if (!pts) notFound();
  // Mesmo gate da página do caso (#69): além da permissão, exige ser a
  // referência ou membro da equipe — senão qualquer clínico lia o caso.
  if (!avaliarVinculoCaso(usuario.id, pts, pts.equipePts.map((m) => m.usuarioId))) {
    redirect("/");
  }

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
