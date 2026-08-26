import type { MetaDoPainel } from "@/server/care-plan/metas";
import type { ConflitoMeta } from "@/server/care-plan/conflitos";

const ROTULOS_STATUS: Record<string, string> = {
  NOVA: "Nova",
  EM_ANDAMENTO: "Em andamento",
  CONCLUIDA: "Concluída",
  NAO_ALCANCADA: "Não alcançada",
};

function BadgeConflito({ metaId, conflitos }: {
  metaId: string;
  conflitos: ConflitoMeta[];
}) {
  const meus = conflitos.filter((c) => c.metaAId === metaId || c.metaBId === metaId);
  if (meus.length === 0) return null;
  return (
    <>
      {meus.map((c, i) => (
        <span
          key={`${c.tipo}-${c.metaAId}-${c.metaBId}-${i}`}
          data-testid={`conflito-${metaId}`}
          title={c.detalhe}
          className="rounded-full bg-destructive/15 px-2 py-0.5 text-xs font-medium text-destructive"
        >
          ⚠ conflito de {c.tipo.toLowerCase()}
        </span>
      ))}
    </>
  );
}

/**
 * Painel cruzado: todas as metas do PTS agrupadas por especialidade.
 * Conflitos são SINALIZADOS (badge), nunca bloqueiam (plano/13 §7).
 * `acoesPorMeta` permite injetar controles por card (server → server).
 */
export function MetasCruzadas({
  metas,
  conflitos,
  acoesPorMeta,
}: {
  metas: MetaDoPainel[];
  conflitos: ConflitoMeta[];
  acoesPorMeta?: Record<string, React.ReactNode>;
}) {
  if (metas.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        Nenhuma meta pactuada ainda para este caso.
      </p>
    );
  }

  const grupos = new Map<string, MetaDoPainel[]>();
  for (const m of metas) {
    const chave = m.donoCategoria ?? "Sem especialidade";
    const lista = grupos.get(chave) ?? [];
    lista.push(m);
    grupos.set(chave, lista);
  }

  return (
    <div className="space-y-6" data-testid="metas-cruzadas">
      {conflitos.length > 0 && (
        <div
          role="status"
          data-testid="resumo-conflitos"
          className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive"
        >
          {conflitos.length} conflito(s) detectado(s) entre metas — sinalizados abaixo; a pactuação não é bloqueada.
        </div>
      )}

      {[...grupos.entries()].map(([especialidade, lista]) => (
        <section key={especialidade} aria-label={especialidade}>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {especialidade}
          </h3>
          <ul className="space-y-3">
            {lista.map((meta) => {
              const vencida =
                meta.prazo.getTime() < Date.now() &&
                (meta.status === "NOVA" || meta.status === "EM_ANDAMENTO");
              return (
                <li
                  key={meta.id}
                  className={`rounded-lg border p-4 ${
                    vencida ? "border-warning/50 bg-warning/5" : ""
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                      {ROTULOS_STATUS[meta.status] ?? meta.status}
                    </span>
                    <span className="text-muted-foreground">{meta.donoNome}</span>
                    <time
                      dateTime={meta.prazo.toISOString()}
                      className={`tabular-nums ${
                        vencida ? "font-medium text-warning" : "text-muted-foreground"
                      }`}
                    >
                      prazo {meta.prazo.toLocaleDateString("pt-BR")}
                    </time>
                    {vencida && (
                      <span className="rounded-full bg-warning/15 px-2 py-0.5 text-xs font-medium text-warning">
                        prazo vencido
                      </span>
                    )}
                    <BadgeConflito metaId={meta.id} conflitos={conflitos} />
                  </div>
                  <p className="mt-2 font-medium">{meta.descTecnica}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{meta.descAcessivel}</p>
                  {acoesPorMeta?.[meta.id] && (
                    <div className="mt-3">{acoesPorMeta[meta.id]}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
