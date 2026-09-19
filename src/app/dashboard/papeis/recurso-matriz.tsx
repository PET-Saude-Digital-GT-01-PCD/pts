"use client";

import { useMemo } from "react";

import { Button } from "@/components/ui/button";

export type RecursoOpcao = {
  chave: string;
  grupo: string;
  descricao: string | null;
};

const GRUPO_LABEL: Record<string, string> = {
  recepcao: "Recepção",
  triage: "Triagem",
  clinical: "Clínico",
  "care-plan": "PTS e metas",
  governanca: "Governança",
  admin: "Administração",
};

const GRUPO_NOTA: Record<string, string> = {
  clinical: "Indisponível para papéis de base GESTOR.",
  "care-plan": "Indisponível para papéis de base GESTOR.",
  admin: "Restrito a papéis de base ADMIN.",
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

  function alternarGrupo(lista: RecursoOpcao[], marcar: boolean) {
    const next = new Set(selecionado);
    for (const r of lista) {
      if (marcar) next.add(r.chave);
      else next.delete(r.chave);
    }
    onChange([...next]);
  }

  return (
    <fieldset className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <legend className="text-sm font-medium">Permissões (recursos)</legend>
        <p className="text-xs text-muted-foreground tabular-nums">
          {selecionado.size} de {recursos.length} selecionados
        </p>
      </div>

      {Object.entries(porGrupo).map(([grupo, lista]) => {
        const marcados = lista.filter((r) => selecionado.has(r.chave)).length;
        const todosMarcados = marcados === lista.length;
        return (
          <div key={grupo} className="space-y-2 rounded-2xl bg-surface-sunken p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">
                  {GRUPO_LABEL[grupo] ?? grupo}{" "}
                  <span className="font-normal text-muted-foreground tabular-nums">
                    ({marcados}/{lista.length})
                  </span>
                </p>
                {GRUPO_NOTA[grupo] ? (
                  <p className="text-xs text-muted-foreground">
                    {GRUPO_NOTA[grupo]}
                  </p>
                ) : null}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={() => alternarGrupo(lista, !todosMarcados)}
              >
                {todosMarcados ? "Limpar grupo" : "Selecionar grupo"}
              </Button>
            </div>

            <div className="grid gap-1.5 sm:grid-cols-2">
              {lista.map((r) => (
                <label
                  key={r.chave}
                  className="flex cursor-pointer items-start gap-2 rounded-xl bg-surface-raised px-3 py-2 text-sm ring-1 ring-foreground/5 transition-colors has-[:checked]:bg-primary/5 has-[:checked]:ring-primary/40 has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50"
                >
                  <input
                    type="checkbox"
                    className="mt-0.5 size-4 accent-primary outline-none"
                    checked={selecionado.has(r.chave)}
                    onChange={() => alternar(r.chave)}
                  />
                  <span>
                    <span className="font-mono text-xs break-all">{r.chave}</span>
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
        );
      })}
    </fieldset>
  );
}
