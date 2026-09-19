import Link from "next/link";
import type { StatusPts } from "@prisma/client";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
    <header className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h1 className="text-xl font-semibold sm:text-2xl">{pts.paciente.nome}</h1>
        <Badge variant="secondary" data-testid="status-pts">
          {LABEL_STATUS[pts.status] ?? pts.status}
        </Badge>
        <span data-testid="semaforo-reuniao-badge">
          <Semaforo status={pts.semaforoReuniao.toLowerCase() as SemaforoStatus} />
        </span>
      </div>

      <div className="space-y-2">
        {faltaRecente && (
          <Alert variant="destructive" data-testid="alerta-falta">
            Falta registrada nos últimos 30 dias — comunicar o profissional de
            referência.
          </Alert>
        )}
        {pts.status === "FECHADO" && (
          <Alert variant="warning" data-testid="banner-fechado">
            PTS fechado — visualização somente leitura.
            {pts.motivoEncerramento ? ` Motivo: ${pts.motivoEncerramento}` : ""}
          </Alert>
        )}
        {pts.status === "REAVALIACAO" && podePtsRevisar && (
          <Alert variant="warning" data-testid="banner-sugestao-revisao">
            PTS em reavaliação — considere{" "}
            <Link
              href={`/casos/${pts.id}?aba=revisoes`}
              className="rounded-sm underline underline-offset-2 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              registrar uma revisão
            </Link>{" "}
            marcando este momento.
          </Alert>
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
      <Button variant="link" size="sm" className="px-0" asChild>
        <Link href={`/portal/${pts.id}`}>Ver como portal do cidadão</Link>
      </Button>
    </header>
  );
}
