"use server";

import { notFound, redirect } from "next/navigation";
import type { StatusMeta } from "@prisma/client";

import { db } from "@/lib/db";
import { getCurrentUser, recursosDoUsuario } from "@/server/iam/session";
import { avaliarVinculoCaso } from "@/server/shared/acesso-caso";
import { lerSessaoPortal } from "@/server/portal/sessao";
import {
  montarPercurso,
  LABEL_STATUS_META_ACESSIVEL,
  type EtapaPercurso,
} from "@/server/care-plan/portal-formatacao";

// Portal do cidadão (#73): visão em linguagem acessível do percurso e das
// metas do PTS. O acesso próprio do cidadão (código emitido na recepção,
// sessão por cookie) está implementado em src/server/portal e decidido no
// ADR-0012; a equipe mantém o caminho antigo (permissão + vínculo ao caso)
// para conferência. Consentimento e pré-chegada do cuidador pelo portal
// ficam como follow-up (Perguntas/03 §3.7).

// OR de permissões da equipe que enxergam o portal (mesmo portão da página
// do caso); a equipe continua restrita ao vínculo (avaliarVinculoCaso).
const PERMISSOES_EQUIPE = [
  "care-plan.meta.ler",
  "clinical.soap.ler",
  "triage.triagem.ver",
];

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
  /** equipe = conferência pelo caso; cidadao = sessão própria (mostra "Sair"). */
  via: "equipe" | "cidadao";
};

async function carregarPts(ptsId: string) {
  return db.pts.findUnique({
    where: { id: ptsId },
    select: {
      status: true,
      pacienteId: true,
      refProfissionalId: true,
      equipePts: { select: { usuarioId: true } },
      paciente: { select: { nome: true } },
      metas: {
        orderBy: [{ status: "asc" }, { prazo: "asc" }],
        select: { id: true, descAcessivel: true, status: true },
      },
    },
  });
}

type PtsDoPortal = NonNullable<Awaited<ReturnType<typeof carregarPts>>>;

function montarView(pts: PtsDoPortal, via: "equipe" | "cidadao"): PortalCidadaoView {
  return {
    pacienteNome: pts.paciente.nome,
    etapas: montarPercurso(pts.status),
    metas: pts.metas.map((m) => ({
      id: m.id,
      descAcessivel: m.descAcessivel,
      status: m.status,
      statusLabel: LABEL_STATUS_META_ACESSIVEL[m.status],
    })),
    via,
  };
}

export async function buscarPortalCidadao(
  ptsId: string,
): Promise<PortalCidadaoView> {
  const usuario = await getCurrentUser();

  if (usuario) {
    const recursos = await recursosDoUsuario(usuario.papelId);
    const temPermissao = PERMISSOES_EQUIPE.some((chave) =>
      recursos.includes(chave),
    );
    // Logado sem permissão clínica individual (ex.: GESTOR): cai fora como
    // no restante do sistema, sem passar pela entrada do cidadão.
    if (!temPermissao) redirect("/");

    const pts = await carregarPts(ptsId);
    if (!pts) notFound();
    // Mesmo gate da página do caso (#69): além da permissão, exige ser a
    // referência ou membro da equipe — senão qualquer clínico lia o caso.
    if (
      !avaliarVinculoCaso(
        usuario.id,
        pts,
        pts.equipePts.map((m) => m.usuarioId),
      )
    ) {
      redirect("/");
    }
    return montarView(pts, "equipe");
  }

  const sessao = await lerSessaoPortal();
  if (sessao) {
    const pts = await carregarPts(ptsId);
    if (!pts) notFound();
    // O cidadão só enxerga o PTS do próprio paciente.
    if (pts.pacienteId !== sessao.pacienteId) redirect("/portal");
    return montarView(pts, "cidadao");
  }

  // Sem sessão da equipe e sem sessão do portal: entrada do cidadão.
  redirect("/portal");
}
