import { listarMetas } from "@/server/care-plan/metas";
import { MetaForm } from "./meta-form";
import { MetaStatusForm } from "./meta-status-form";

const ROTULOS_STATUS: Record<string, string> = {
  NOVA: "Nova",
  EM_ANDAMENTO: "Em andamento",
  CONCLUIDA: "Concluída",
  NAO_ALCANCADA: "Não alcançada",
};

export async function AbaMetas({
  ptsId,
  podeEscrever,
  donoId,
}: {
  ptsId: string;
  podeEscrever: boolean;
  donoId: string;
}) {
  const metas = await listarMetas(ptsId);

  return (
    <div className="space-y-4" data-testid="aba-metas">
      {podeEscrever && <MetaForm ptsId={ptsId} donoId={donoId} />}

      {metas.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          Nenhuma meta pactuada ainda.
        </p>
      ) : (
        <ul className="space-y-3">
          {metas.map((meta) => {
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
                  <span className="text-muted-foreground">
                    {meta.donoCategoria ? `${meta.donoCategoria} · ` : ""}
                    {meta.donoNome}
                  </span>
                  <time
                    dateTime={meta.prazo.toISOString()}
                    className={`tabular-nums ${
                      vencida
                        ? "font-medium text-warning"
                        : "text-muted-foreground"
                    }`}
                  >
                    prazo {meta.prazo.toLocaleDateString("pt-BR")}
                  </time>
                  {vencida && (
                    <span className="rounded-full bg-warning/15 px-2 py-0.5 text-xs font-medium text-warning">
                      prazo vencido
                    </span>
                  )}
                </div>
                <p className="mt-2 font-medium">{meta.descTecnica}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {meta.descAcessivel}
                </p>
                {podeEscrever && (
                  <div className="mt-3">
                    <MetaStatusForm
                      metaId={meta.id}
                      status={meta.status}
                      versao={meta.versao}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
