import Link from "next/link";
import type { StatusPts } from "@prisma/client";
import { Semaforo, type SemaforoStatus } from "@/components/ui/semaforo";
import { TransicaoStatusForm } from "./transicao-status-form";
import { SemaforoReuniaoForm } from "./semaforo-reuniao-form";
import type { EntradaReuniao } from "@/server/care-plan/semaforo-reuniao";

const LABEL_STATUS: Record<string, string> = {
  EM_AVALIACAO: "Em avaliação",
  PACTACAO: "Pactuação",
  SEGUIMENTO: "Seguimento",
  REAVALIACAO: "Reavaliação",
  FECHADO: "Fechado",
};

export function CasoHeader({
  pts,
  faltaRecente,
  podePtsRevisar,
  podePtsEncerrar,
  naoFechado,
  entradaReuniao,
  sugestaoSemaforo,
}: {
  pts: {
    id: string;
    status: StatusPts;
    versao: number;
    semaforoReuniao: string;
    motivoEncerramento: string | null;
    paciente: { nome: string };
    cer: { nome: string };
    refProfissional: { nome: string } | null;
  };
  faltaRecente: boolean;
  podePtsRevisar: boolean;
  podePtsEncerrar: boolean;
  naoFechado: boolean;
  entradaReuniao: EntradaReuniao;
  sugestaoSemaforo: "VERDE" | "AMARELO" | "VERMELHO";
}) {
  return (
    <header className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">{pts.paciente.nome}</h1>
        <span
          data-testid="status-pts"
          className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium"
        >
          {LABEL_STATUS[pts.status] ?? pts.status}
        </span>
        <span data-testid="semaforo-reuniao-badge">
          <Semaforo status={pts.semaforoReuniao.toLowerCase() as SemaforoStatus} />
        </span>
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
            {pts.motivoEncerramento ? ` Motivo: ${pts.motivoEncerramento}` : ""}
          </p>
        )}
        {pts.status === "REAVALIACAO" && podePtsRevisar && (
          <p
            data-testid="banner-sugestao-revisao"
            role="status"
            className="w-full rounded-lg border border-warning/40 bg-warning/10 px-4 py-2 text-sm text-warning"
          >
            PTS em reavaliação — considere{" "}
            <a href={`/casos/${pts.id}?aba=revisoes`} className="underline">
              registrar uma revisão
            </a>{" "}
            marcando este momento.
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
      <TransicaoStatusForm
        ptsId={pts.id}
        status={pts.status}
        versao={pts.versao}
        podeRevisar={podePtsRevisar}
        podeEncerrar={podePtsEncerrar}
      />
      {podePtsRevisar && naoFechado && (
        <SemaforoReuniaoForm
          ptsId={pts.id}
          versao={pts.versao}
          entrada={entradaReuniao}
          sugestao={sugestaoSemaforo}
        />
      )}
      <Link
        href={`/portal/${pts.id}`}
        className="inline-block text-sm text-primary underline underline-offset-2"
      >
        Ver como portal do cidadão
      </Link>
    </header>
  );
}
