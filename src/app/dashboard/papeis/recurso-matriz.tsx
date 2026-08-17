"use client";

import { useMemo } from "react";

export type RecursoOpcao = {
  chave: string;
  grupo: string;
  descricao: string | null;
};

export function RecursoMatriz({
  recursos,
  selecionados,
  onChange,
}: {
  recursos: RecursoOpcao[];
  selecionados: string[];
  onChange: (chaves: string[]) => void;
}) {
  const porGrupo = useMemo(
    () =>
      recursos.reduce<Record<string, RecursoOpcao[]>>((acc, r) => {
        (acc[r.grupo] ??= []).push(r);
        return acc;
      }, {}),
    [recursos],
  );

  const selecionado = new Set(selecionados);

  function alternar(chave: string) {
    const next = new Set(selecionado);
    if (next.has(chave)) next.delete(chave);
    else next.add(chave);
    onChange([...next]);
  }

  return (
    <fieldset className="space-y-4">
      <legend className="text-sm font-medium">Permissões (recursos)</legend>
      {Object.entries(porGrupo).map(([grupo, lista]) => (
        <div key={grupo} className="space-y-1.5">
          <p className="text-sm font-semibold text-muted-foreground">{grupo}</p>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {lista.map((r) => (
              <label
                key={r.chave}
                className="flex items-start gap-2 rounded-md border px-3 py-2 text-sm"
              >
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={selecionado.has(r.chave)}
                  onChange={() => alternar(r.chave)}
                />
                <span>
                  <span className="font-mono text-xs">{r.chave}</span>
                  {r.descricao ? (
                    <span className="block text-xs text-muted-foreground">
                      {r.descricao}
                    </span>
                  ) : null}
                </span>
              </label>
            ))}
          </div>
        </div>
      ))}
    </fieldset>
  );
}