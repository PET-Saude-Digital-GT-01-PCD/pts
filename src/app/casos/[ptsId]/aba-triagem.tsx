import type { Semaforo } from "@prisma/client";

import { Semaforo as SemaforoBadge, type SemaforoStatus } from "@/components/ui/semaforo";
import { classificacaoVigente } from "@/server/triage/classificacao-vigente";
import { AjusteForm } from "./ajuste-form";
import { TriagemForm } from "./triagem-form";

type TriagemResumo = {
  id: string;
  classificacao: Semaforo;
  resultadoElegibilidade: string;
  justificativa: string | null;
  criadaEm: Date;
  ajustes: { para: Semaforo }[];
};

const ELEGIBILIDADE_LABEL: Record<string, string> = {
  ELEGIVEL: "Elegível",
  REVISAO_MANUAL: "Revisão manual",
  NAO_ELEGIVEL: "Não elegível",
};

export function AbaTriagem({
  ptsId,
  versaoPts,
  triagens,
}: {
  ptsId: string;
  versaoPts: number;
  triagens: TriagemResumo[];
}) {
  const maisRecente = triagens[0];
  const vigente = maisRecente
    ? classificacaoVigente(
        maisRecente.classificacao,
        maisRecente.ajustes.length > 0
          ? maisRecente.ajustes[maisRecente.ajustes.length - 1]
          : null,
      )
    : null;

  return (
    <div className="space-y-6">
      {maisRecente && vigente ? (
        <section className="space-y-3" data-testid="resultado-semaforo">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-sm font-medium">Classificação vigente</h3>
            <span data-testid="vigente-badge">
              <SemaforoBadge
                status={vigente.toLowerCase() as SemaforoStatus}
              />
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Última triagem em{" "}
            {maisRecente.criadaEm.toLocaleDateString("pt-BR")} —{" "}
            {ELEGIBILIDADE_LABEL[maisRecente.resultadoElegibilidade] ??
              maisRecente.resultadoElegibilidade}
          </p>
          <AjusteForm triagemId={maisRecente.id} vigente={vigente} />
        </section>
      ) : (
        <p className="text-muted-foreground text-sm">
          Nenhuma triagem registrada neste caso ainda.
        </p>
      )}

      {triagens.length > 1 ? (
        <section className="space-y-2">
          <h3 className="text-sm font-medium">Histórico</h3>
          <ul className="space-y-1 text-sm">
            {triagens.map((t) => (
              <li key={t.id} className="flex gap-2">
                <time className="text-muted-foreground tabular-nums">
                  {t.criadaEm.toLocaleDateString("pt-BR")}
                </time>
                <span>{t.classificacao}</span>
                <span className="text-muted-foreground">
                  {ELEGIBILIDADE_LABEL[t.resultadoElegibilidade]}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <TriagemForm ptsId={ptsId} versao={versaoPts} />
    </div>
  );
}
