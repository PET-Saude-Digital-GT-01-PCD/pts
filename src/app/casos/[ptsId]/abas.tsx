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
    <div role="tablist" className="flex gap-1 border-b">
      {(Object.keys(TITULOS) as AbaKey[]).map((aba) => (
        <Link
          key={aba}
          role="tab"
          aria-selected={aba === ativa}
          href={`/casos/${ptsId}?aba=${aba}`}
          className={`px-4 py-2 text-sm font-medium rounded-t-md ${
            aba === ativa
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:text-foreground"
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
      className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground"
    >
      {titulo}: conteúdo em breve.
    </div>
  );
}
