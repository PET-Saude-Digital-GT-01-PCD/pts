import { cn } from "@/lib/utils";

/**
 * Moldura comum das telas administrativas: fundo levemente tingido e cabeçalho
 * com título/descrição/ações. A navegação entre as áreas é só a lateral
 * (Sidebar); as telas cuidam apenas do próprio conteúdo.
 */
export function AdminShell({
  titulo,
  descricao,
  acoes,
  largura = "padrao",
  children,
}: {
  titulo: string;
  descricao?: React.ReactNode;
  acoes?: React.ReactNode;
  largura?: "padrao" | "estreita" | "larga";
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-full bg-surface pb-12">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 sm:p-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Administração
            </p>
            <h1 className="text-2xl font-semibold tracking-tight">{titulo}</h1>
            {descricao ? (
              <p className="max-w-prose text-sm text-muted-foreground">
                {descricao}
              </p>
            ) : null}
          </div>
          {acoes ? (
            <div className="flex shrink-0 flex-wrap items-center gap-2">{acoes}</div>
          ) : null}
        </header>

        {/* O cabeçalho fica na largura total; só o conteúdo estreita,
            para o formulário não virar uma linha de leitura longa demais. */}
        <div
          className={cn(
            "flex w-full flex-col gap-6",
            largura === "estreita" && "max-w-2xl",
            largura === "padrao" && "max-w-4xl",
          )}
        >
          {children}
        </div>
      </div>
    </main>
  );
}

/** Bloco de conteúdo das telas de admin: cartão macio com título opcional. */
export function AdminPanel({
  titulo,
  descricao,
  acoes,
  className,
  children,
  ...props
}: React.ComponentProps<"section"> & {
  titulo?: string;
  descricao?: React.ReactNode;
  acoes?: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "flex flex-col gap-4 rounded-3xl bg-surface-raised p-5 shadow-soft ring-1 ring-foreground/5 sm:p-6",
        className,
      )}
      {...props}
    >
      {titulo || acoes ? (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            {titulo ? (
              <h2 className="text-base font-semibold">{titulo}</h2>
            ) : null}
            {descricao ? (
              <p className="max-w-prose text-sm text-muted-foreground">
                {descricao}
              </p>
            ) : null}
          </div>
          {acoes ? <div className="flex items-center gap-2">{acoes}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
