import Link from "next/link";
import type { StatusPts } from "@prisma/client";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Semaforo, type SemaforoStatus } from "@/components/ui/semaforo";
import { TransicaoStatusForm } from "./transicao-status-form";
import { SemaforoReuniaoForm } from "./semaforo-reuniao-form";
import { AcessoCidadaoBloco } from "@/components/portal/acesso-cidadao-bloco";
import type { InfoAcessoCidadao } from "@/server/care-plan/portal-cidadao-leitura";
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
  podeGerarLinkCidadao,
  infoAcessoCidadao,
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
  podeGerarLinkCidadao: boolean;
  infoAcessoCidadao: InfoAcessoCidadao;
}) {
  return (
    <header className="space-y-4">
      <Card>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Projeto Terapêutico Singular
              </p>
              <h1 className="text-xl font-semibold sm:text-2xl">
                {pts.paciente.nome}
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" data-testid="status-pts">
                {LABEL_STATUS[pts.status] ?? pts.status}
              </Badge>
              <span data-testid="semaforo-reuniao-badge">
                <Semaforo
                  status={pts.semaforoReuniao.toLowerCase() as SemaforoStatus}
                />
              </span>
            </div>
          </div>

          <dl className="grid gap-3 border-t border-border pt-4 text-sm sm:grid-cols-3">
            <div className="space-y-0.5">
              <dt className="text-xs text-muted-foreground">
                Profissional de referência
              </dt>
              <dd className="font-medium">
                {pts.refProfissional?.nome ?? "Não definido"}
              </dd>
            </div>
            <div className="space-y-0.5">
              <dt className="text-xs text-muted-foreground">Equipe / CER</dt>
              <dd className="font-medium">{pts.cer.nome}</dd>
            </div>
            <div className="space-y-0.5">
              <dt className="text-xs text-muted-foreground">Visão do cidadão</dt>
              <dd>
                <Button variant="link" size="sm" className="h-auto px-0" asChild>
                  <Link href={`/portal/${pts.id}`}>Abrir portal do cidadão</Link>
                </Button>
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

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

      <TransicaoStatusForm
        ptsId={pts.id}
        status={pts.status}
        versao={pts.versao}
        podeRevisar={podePtsRevisar}
        podeEncerrar={podePtsEncerrar}
      />
      {podeGerarLinkCidadao && (
        <AcessoCidadaoBloco ptsId={pts.id} info={infoAcessoCidadao} />
      )}
      {podePtsRevisar && naoFechado && (
        <SemaforoReuniaoForm
          ptsId={pts.id}
          versao={pts.versao}
          entrada={entradaReuniao}
          sugestao={sugestaoSemaforo}
        />
      )}
    </header>
  );
}
