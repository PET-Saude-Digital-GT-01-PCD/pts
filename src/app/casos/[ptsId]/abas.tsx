import Link from "next/link";

const TITULOS = {
  avaliacoes: "Avaliações",
  metas: "Metas",
  mural: "Mural",
  triagem: "Triagem",
  revisoes: "Revisões",
} as const;

export type AbaKey = keyof typeof TITULOS;

export function ehAba(valor: string | undefined): valor is AbaKey {
  return !!valor && valor in TITULOS;
}

export function AbasNav({ ativa, ptsId }: { ativa: AbaKey; ptsId: string }) {
  return (
    <div
      role="tablist"
      aria-label="Seções do caso"
      className="-mx-4 flex gap-1 overflow-x-auto border-b border-border px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden"
    >
      {(Object.keys(TITULOS) as AbaKey[]).map((aba) => (
        <Link
          key={aba}
          role="tab"
          aria-selected={aba === ativa}
          href={`/casos/${ptsId}?aba=${aba}`}
          aria-current={aba === ativa ? "page" : undefined}
          className={`shrink-0 rounded-t-md border-b-2 px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 ${
            aba === ativa
              ? "border-primary bg-muted text-foreground"
              : "border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          }`}
        >
          {TITULOS[aba]}
        </Link>
      ))}
    </div>
  );
}

export function AbaVazia({ titulo }: { titulo: string }) {
  return (
    <div
      data-testid="aba-vazia"
      className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground"
    >
      {titulo}: conteúdo em breve.
    </div>
  );
}
