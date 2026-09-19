import { Target } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
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

  // Agrupa por tipo: N conflitos do mesmo tipo viravam N selos idênticos e
  // afogavam a descrição da meta.
  const porTipo = new Map<string, ConflitoMeta[]>();
  for (const c of meus) {
    porTipo.set(c.tipo, [...(porTipo.get(c.tipo) ?? []), c]);
  }

  return (
    <>
      {[...porTipo.entries()].map(([tipo, lista]) => (
        <Badge
          key={tipo}
          variant="destructive"
          data-testid={`conflito-${metaId}`}
          title={lista.map((c) => c.detalhe).join("\n")}
        >
          <span aria-hidden>⚠</span>
          {lista.length > 1
            ? `${lista.length} conflitos de ${tipo.toLowerCase()}`
            : `conflito de ${tipo.toLowerCase()}`}
        </Badge>
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
      <EmptyState
        icon={Target}
        titulo="Nenhuma meta pactuada"
        descricao="As metas SMART deste caso aparecem aqui depois da pactuação com a equipe e a família."
      />
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
                  className={`rounded-lg border border-border p-4 transition-colors hover:bg-muted/40 ${
                    vencida ? "border-warning/50 bg-warning/5" : ""
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <Badge variant="secondary">
                      {ROTULOS_STATUS[meta.status] ?? meta.status}
                    </Badge>
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
                      <Badge variant="warning">prazo vencido</Badge>
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
