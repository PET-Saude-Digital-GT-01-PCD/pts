import type { PortalCidadaoView } from "@/server/care-plan/portal-cidadao-leitura";

// Conteúdo do portal do cidadão, compartilhado entre a conferência da equipe
// (/portal/[ptsId]) e o acesso por link (/portal-cidadao/[codigo]) — as duas
// rotas mostram exatamente a mesma coisa (ADR-0012).

const CLASSE_SITUACAO: Record<string, string> = {
  concluida: "border-success/40 bg-success/10 text-success",
  atual: "border-primary bg-primary/10 text-primary font-semibold",
  a_fazer: "border-border bg-muted text-muted-foreground",
};

const CLASSE_STATUS_META: Record<string, string> = {
  CONCLUIDA: "border-success/40 bg-success/10 text-success",
  EM_ANDAMENTO: "border-primary/40 bg-primary/10 text-primary",
  NOVA: "border-border bg-muted text-muted-foreground",
  NAO_ALCANCADA: "border-warning/40 bg-warning/10 text-warning",
};

export function PortalCidadaoConteudo({ view }: { view: PortalCidadaoView }) {
  const { pacienteNome, etapas, metas } = view;

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-8 p-6 text-base leading-relaxed sm:p-8">
      <div>
        <p className="text-sm text-muted-foreground">Olá,</p>
        <h1 className="text-2xl font-semibold">{pacienteNome}</h1>
        <p className="mt-1 text-muted-foreground">
          Aqui você acompanha os passos do seu cuidado e o que já foi combinado com a equipe.
        </p>
      </div>

      <section aria-labelledby="titulo-percurso" className="flex flex-col gap-3">
        <h2 id="titulo-percurso" className="text-lg font-medium">
          Seu percurso
        </h2>
        <ol className="flex flex-col gap-2">
          {etapas.map((etapa) => (
            <li
              key={etapa.chave}
              aria-current={etapa.situacao === "atual" ? "step" : undefined}
              data-testid={`etapa-${etapa.chave}`}
              className={`flex items-center gap-3 rounded-lg border p-3 ${CLASSE_SITUACAO[etapa.situacao]}`}
            >
              <span aria-hidden="true" className="text-lg">
                {etapa.situacao === "concluida" ? "✓" : etapa.situacao === "atual" ? "●" : "○"}
              </span>
              <span>
                {etapa.label}
                {etapa.situacao === "atual" && (
                  <span className="ml-2 text-xs font-normal">(você está aqui)</span>
                )}
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="titulo-metas" className="flex flex-col gap-3">
        <h2 id="titulo-metas" className="text-lg font-medium">
          O que combinamos com você
        </h2>
        {metas.length === 0 ? (
          <p className="text-muted-foreground">
            Ainda não há metas registradas. A equipe vai combinar os próximos passos com você.
          </p>
        ) : (
          <ul className="flex flex-col gap-3" data-testid="lista-metas-portal">
            {metas.map((meta) => (
              <li key={meta.id} data-testid={`meta-portal-${meta.id}`} className="rounded-lg border p-4">
                <p>{meta.descAcessivel}</p>
                <span
                  className={`mt-2 inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${CLASSE_STATUS_META[meta.status]}`}
                >
                  {meta.statusLabel}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
