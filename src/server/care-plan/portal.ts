"use server";

import { notFound } from "next/navigation";

import { exigirUmaDasOuRedirect } from "@/server/care-plan/acesso";
import {
  carregarPortalDoPts,
  type PortalCidadaoView,
} from "@/server/care-plan/portal-cidadao-leitura";

export type { PortalCidadaoView };

// Portal do cidadão (#73): visão em linguagem acessível do percurso e das
// metas do PTS. Esta é a conferência pela equipe (mesmo OR de permissão da
// página do caso). O acesso do próprio cidadão é o link público
// /portal-cidadao/<codigo>, decidido no ADR-0012 e implementado em
// acesso-cidadao.ts + portal-cidadao-leitura.ts — não depende de sessão.
// Consentimento e pré-chegada do cuidador pelo portal ficam fora deste
// escopo (ADR-0012 §Escopo adiado).

export async function buscarPortalCidadao(ptsId: string): Promise<PortalCidadaoView> {
  await exigirUmaDasOuRedirect([
    "care-plan.meta.ler",
    "clinical.soap.ler",
    "triage.triagem.ver",
  ]);

  const view = await carregarPortalDoPts(ptsId);
  if (!view) notFound();
  return view;
}
