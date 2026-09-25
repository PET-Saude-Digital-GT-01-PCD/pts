"use server";

import { notFound, redirect } from "next/navigation";

import { exigirUmaDasOuRedirect } from "@/server/care-plan/acesso";
import {
  carregarPortalDoPts,
  type PortalCidadaoView,
} from "@/server/care-plan/portal-cidadao-leitura";
import { podeAcessarCaso } from "@/server/shared/acesso-caso";

// Portal do cidadão (#73): visão em linguagem acessível do percurso e das
// metas do PTS. Esta é a conferência pela equipe (mesmo OR de permissão da
// página do caso), com o gate de vínculo do caso (#69) por cima. O acesso do
// próprio cidadão é o link público /portal-cidadao/<codigo>, decidido no
// ADR-0012 e implementado em acesso-cidadao.ts + portal-cidadao-leitura.ts —
// não depende de sessão. Consentimento e pré-chegada do cuidador pelo portal
// ficam fora deste escopo (ADR-0012 §Escopo adiado).
//
// ponytail: o gate de vínculo (#69) e a projeção vêm de dois módulos, então
// são duas queries em quem tem sessão. Se a latência incomodar, junte
// refProfissionalId + equipePts dentro de `carregarPortalDoPts` — desde que
// a rota pública continue devolvendo exatamente a mesma projeção.

export async function buscarPortalCidadao(ptsId: string): Promise<PortalCidadaoView> {
  const usuario = await exigirUmaDasOuRedirect([
    "care-plan.meta.ler",
    "clinical.soap.ler",
    "triage.triagem.ver",
  ]);

  const view = await carregarPortalDoPts(ptsId);
  if (!view) notFound();

  // Mesmo gate da página do caso (#69): além da permissão, exige ser a
  // referência ou membro da equipe — senão qualquer clínico lia o caso.
  if (!(await podeAcessarCaso(usuario.id, ptsId))) {
    redirect("/");
  }

  return view;
}
