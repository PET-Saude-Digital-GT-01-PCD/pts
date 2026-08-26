import { notFound } from "next/navigation";
import { Semaforo, type SemaforoStatus } from "@/components/ui/semaforo";

import { db } from "@/lib/db";
import { exigirUmaDasOuRedirect } from "@/server/care-plan/acesso";
import {
  montarTimeline,
  type ItemTimeline,
} from "@/server/care-plan/painel";
import { temFaltaRecente } from "@/server/care-plan/eventos";
import { AbaVazia, AbasNav, ehAba } from "./abas";

const LABEL_STATUS: Record<string, string> = {
  EM_AVALIACAO: "Em avaliação",
  PACTACAO: "Pactuação",
  SEGUIMENTO: "Seguimento",
  REAVALIACAO: "Reavaliação",
  FECHADO: "Fechado",
};

export default async function PainelCasoPage({
  params,
  searchParams,
}: {
  params: Promise<{ ptsId: string }>;
  searchParams: Promise<{ aba?: string }>;
}) {
  await exigirUmaDasOuRedirect(["care-plan.meta.ler", "clinical.soap.ler"]);

  const { ptsId } = await params;
  const { aba } = await searchParams;
  const abaAtiva = ehAba(aba) ? aba : "avaliacoes";

  const pts = await db.pts.findUnique({
    where: { id: ptsId },
    include: {
      paciente: true,
      cer: true,
      refProfissional: true,
      triagens: { select: { id: true, classificacao: true, criadaEm: true } },
      revisoes: { select: { id: true, numero: true, motivo: true, data: true } },
      metas: {
        select: { id: true, descTecnica: true, dataPactuacao: true },
      },
      avaliacoes: {
        select: { id: true, especialidade: true, criadaEm: true },
      },
      eventos: {
        select: { id: true, tipo: true, data: true },
      },
    },
  });
  if (!pts) notFound();

  const [faltaRecente] = await Promise.all([temFaltaRecente(pts.id)]);

  const timeline: ItemTimeline[] = montarTimeline({
    aberturaEm: pts.aberturaEm,
    avaliacoes: pts.avaliacoes,
    metas: pts.metas,
    revisoes: pts.revisoes,
    triagens: pts.triagens,
    eventosCuidado: pts.eventos,
  });

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl space-y-6 p-8">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">{pts.paciente.nome}</h1>
          <span
            data-testid="status-pts"
            className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium"
          >
            {LABEL_STATUS[pts.status] ?? pts.status}
          </span>
          <Semaforo
            status={pts.semaforoReuniao.toLowerCase() as SemaforoStatus}
          />
          {faltaRecente && (
            <p
              data-testid="alerta-falta"
              role="alert"
              className="w-full rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive"
            >
              Falta registrada nos últimos 30 dias — comunicar o profissional de
              referência.
            </p>
          )}
          {pts.status === "FECHADO" && (
            <p
              data-testid="banner-fechado"
              role="alert"
              className="w-full rounded-lg border border-warning/40 bg-warning/10 px-4 py-2 text-sm text-warning"
            >
              PTS fechado — visualização somente leitura.
              {pts.motivoEncerramento
                ? ` Motivo: ${pts.motivoEncerramento}`
                : ""}
            </p>
          )}
        </div>
        <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
          <div>
            <dt className="inline">Ref. profissional: </dt>
            <dd className="inline text-foreground">
              {pts.refProfissional?.nome ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="inline">Equipe/CER: </dt>
            <dd className="inline text-foreground">{pts.cer.nome}</dd>
          </div>
        </dl>
      </header>

      <section aria-label="Timeline do caso" className="space-y-2">
        <h2 className="text-lg font-medium">Timeline</h2>
        {timeline.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum evento registrado ainda.
          </p>
        ) : (
          <ol className="space-y-2">
            {timeline.map((item, i) => (
              <li key={`${item.tipo}-${i}`} className="flex gap-3 text-sm">
                <time className="w-36 shrink-0 tabular-nums text-muted-foreground">
                  {item.data.toLocaleDateString("pt-BR")}
                </time>
                <span className="font-medium">{item.titulo}</span>
                {item.detalhe && (
                  <span className="text-muted-foreground">{item.detalhe}</span>
                )}
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="space-y-4">
        <AbasNav ativa={abaAtiva} ptsId={pts.id} />
        <div role="tabpanel">
          <AbaVazia titulo={abaAtiva[0].toUpperCase() + abaAtiva.slice(1)} />
        </div>
      </section>
    </main>
  );
}
