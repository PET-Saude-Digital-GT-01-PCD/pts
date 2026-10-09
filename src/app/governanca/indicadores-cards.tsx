import { EmptyState } from "@/components/ui/empty-state";
import { classificarIndicador, type IndicadorGovernanca } from "@/server/governance/indicadores";

const STATUS_LABEL = { OK: "OK", ATENCAO: "Atenção", SEM_DADO: "Sem dado" };
const STATUS_CLASSE = {
  OK: "border-success/40 bg-success/10 text-success",
  ATENCAO: "border-destructive/40 bg-destructive/10 text-destructive",
  SEM_DADO: "border-border bg-muted text-muted-foreground",
};
const ESCOPO_LABEL = {
  ATUAL: "Situação atual",
  PERIODO: "No período aplicado",
  INDISPONIVEL: "Fonte ainda indisponível",
};

export function IndicadoresCards({ indicadores, carregando }: {
  indicadores: IndicadorGovernanca[];
  carregando: boolean;
}) {
  const semDados = indicadores.length > 0 && indicadores.every((ind) => !ind.disponivel || ind.valor === null);
  return (
    <section aria-label="Indicadores" aria-busy={carregando} className="space-y-4">
      {indicadores.length === 0 || semDados ? (
        <EmptyState titulo="Nenhum dado disponível para os indicadores"
          descricao="Confira as fontes e o período aplicado. Dados indisponíveis não representam valor zero." />
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2" data-testid="lista-indicadores">
        {indicadores.map((ind) => {
          const status = ind.disponivel ? classificarIndicador(ind.valor, ind.meta, ind.maiorEhMelhor) : "SEM_DADO";
          return (
            <article key={ind.id} data-testid={`indicador-${ind.id}`}
              className="rounded-2xl bg-surface-raised p-4 shadow-soft ring-1 ring-foreground/5">
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-sm font-medium">{ind.titulo}</h2>
                <span className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_CLASSE[status]}`}>
                  {STATUS_LABEL[status]}
                </span>
              </div>
              <p className="mt-2 text-2xl font-semibold">
                {!ind.disponivel || ind.valor === null ? "—" : ind.unidade === "%" ? `${ind.valor}%` : `${ind.valor} ${ind.unidade}`}
              </p>
              <p className="text-xs text-muted-foreground">
                Meta: {ind.maiorEhMelhor ? "≥" : "≤"}{ind.meta}{ind.unidade === "%" ? "%" : ` ${ind.unidade}`}
              </p>
              <p className="mt-2 text-xs font-medium">{ESCOPO_LABEL[ind.escopoTemporal]}</p>
              <p className="text-xs text-muted-foreground">{ind.descricaoTemporal}</p>
              <p className="mt-2 text-xs text-muted-foreground">Cálculo: {ind.formula}</p>
              <p className="mt-1 break-words text-xs text-muted-foreground">Fonte: {ind.fonte}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
