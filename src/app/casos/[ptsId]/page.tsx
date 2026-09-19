import { notFound, redirect } from "next/navigation";

import { db } from "@/lib/db";
import {
  exigirUmaDasOuRedirect,
  temUmaDas,
} from "@/server/care-plan/acesso";
import {
  montarTimeline,
  type ItemTimeline,
} from "@/server/care-plan/painel";
import { temFaltaRecente } from "@/server/care-plan/eventos";
import { montarResumoCaso } from "@/server/care-plan/resumo-caso";
import { avaliarVinculoCaso } from "@/server/shared/acesso-caso";
import { AbasNav, ehAba } from "./abas";
import { AbaAvaliacoes } from "./aba-avaliacoes";
import { AbaTriagem } from "./aba-triagem";
import { AbaMetas } from "./aba-metas";
import { AbaMural } from "./aba-mural";
import { CasoHeader } from "./caso-header";
import { EventoForm } from "./evento-form";
import { AbaRevisoes } from "./aba-revisoes";
import { TimelineCaso } from "./timeline-caso";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default async function PainelCasoPage({
  params,
  searchParams,
}: {
  params: Promise<{ ptsId: string }>;
  searchParams: Promise<{ aba?: string }>;
}) {
  const usuario = await exigirUmaDasOuRedirect([
    "care-plan.meta.ler",
    "clinical.soap.ler",
    // triador lê o caso para preencher/ajustar a triagem (issue #18)
    "triage.triagem.ver",
  ]);

  const { ptsId } = await params;
  const { aba } = await searchParams;
  const abaAtiva = ehAba(aba) ? aba : "avaliacoes";

  const pts = await db.pts.findUnique({
    where: { id: ptsId },
    include: {
      paciente: true,
      cer: true,
      refProfissional: true,
      equipePts: { select: { usuarioId: true } },
      triagens: {
        select: {
          id: true,
          classificacao: true,
          resultadoElegibilidade: true,
          justificativa: true,
          criadaEm: true,
          ajustes: { select: { para: true } },
        },
        orderBy: { criadaEm: "desc" },
      },
      revisoes: { select: { id: true, numero: true, motivo: true, data: true } },
      metas: {
        select: {
          id: true,
          descTecnica: true,
          dataPactuacao: true,
          status: true,
          prazo: true,
          criteriosJson: true,
          dono: { select: { categoria: true } },
        },
      },
      avaliacoes: {
        select: {
          id: true,
          especialidade: true,
          criadaEm: true,
          dadosJson: true,
        },
      },
      eventos: {
        select: { id: true, tipo: true, data: true, observacao: true },
      },
    },
  });
  if (!pts) notFound();

  // Vínculo ao caso (#69): acesso clínico individual exige ser a referência
  // ou membro da equipe do caso, além do recurso (permissão) já checado acima.
  if (
    !avaliarVinculoCaso(
      usuario.id,
      pts,
      pts.equipePts.map((m) => m.usuarioId),
    )
  ) {
    redirect("/");
  }

  const [
    faltaRecente,
    podeMetaEscreverPerm,
    podeMuralEscreverPerm,
    podePtsRevisar,
    podePtsEncerrar,
    podeRegistrarEvento,
  ] = await Promise.all([
    temFaltaRecente(pts.id),
    temUmaDas(["care-plan.meta.escrever"]),
    temUmaDas(["care-plan.mural.escrever"]),
    temUmaDas(["care-plan.pts.revisar"]),
    temUmaDas(["care-plan.pts.encerrar"]),
    temUmaDas(["care-plan.pts.revisar", "clinical.avaliacao.escrever"]),
  ]);

  // PTS FECHADO → somente leitura para a equipe, em toda aba de escrita.
  // TransicaoStatusForm já se autolimita pelas transições válidas do status
  // (transicoesValidas("FECHADO") === []), não precisa do gate aqui.
  const naoFechado = pts.status !== "FECHADO";
  const podeMetaEscrever = podeMetaEscreverPerm && naoFechado;
  const podeMuralEscrever = podeMuralEscreverPerm && naoFechado;

  const timeline: ItemTimeline[] = montarTimeline({
    aberturaEm: pts.aberturaEm,
    avaliacoes: pts.avaliacoes,
    metas: pts.metas,
    revisoes: pts.revisoes,
    triagens: pts.triagens,
    eventosCuidado: pts.eventos,
  });

  // Entrada da classificação de reunião (plano/13 §11, heurística v1).
  const { entradaReuniao, sugestaoSemaforo } = montarResumoCaso(
    pts,
    faltaRecente,
  );

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-8">
      <CasoHeader
        pts={pts}
        faltaRecente={faltaRecente}
        podePtsRevisar={podePtsRevisar}
        podePtsEncerrar={podePtsEncerrar}
        naoFechado={naoFechado}
        entradaReuniao={entradaReuniao}
        sugestaoSemaforo={sugestaoSemaforo}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <section className="space-y-4">
          <AbasNav ativa={abaAtiva} ptsId={pts.id} />
          <div role="tabpanel">
            <Suspense key={abaAtiva} fallback={<AbaCarregando />}>
              {abaAtiva === "avaliacoes" ? (
                <AbaAvaliacoes ptsId={pts.id} podeEscrever={naoFechado} />
              ) : abaAtiva === "triagem" ? (
                <AbaTriagem ptsId={pts.id} versaoPts={pts.versao} triagens={pts.triagens} />
              ) : abaAtiva === "metas" ? (
                <AbaMetas ptsId={pts.id} podeEscrever={podeMetaEscrever} donoId={usuario.id} />
              ) : abaAtiva === "mural" ? (
                <AbaMural ptsId={pts.id} podeEscrever={podeMuralEscrever} />
              ) : abaAtiva === "revisoes" ? (
                <AbaRevisoes ptsId={pts.id} podeEscrever={podePtsRevisar} />
              ) : null}
            </Suspense>
          </div>
        </section>

        <section aria-label="Linha do tempo do caso" className="lg:sticky lg:top-6">
          <Card>
            <CardHeader className="gap-1">
              <CardTitle asChild className="text-base">
                <h2>Linha do tempo</h2>
              </CardTitle>
              <CardDescription>Últimos acontecimentos do caso.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {podeRegistrarEvento && naoFechado && <EventoForm ptsId={pts.id} />}
              <TimelineCaso itens={timeline} />
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}

/** Esqueleto da aba enquanto o conteúdo carrega (Suspense por aba). */
function AbaCarregando() {
  return (
    <div className="space-y-3" aria-busy="true">
      <span className="sr-only" role="status">
        Carregando…
      </span>
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-24 w-full" />
      ))}
    </div>
  );
}
