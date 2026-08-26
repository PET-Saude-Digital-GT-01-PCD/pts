"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { criarAvaliacaoEspecialidade } from "@/server/clinical/avaliacao-especialidade";

// Checklist visual → códigos CIF gerados em background (RF-4.2).
// Zero digitação de código: o profissional só marca itens.

const CHECKLISTS = {
  FISIO: [
    ["mobilidade", "Mobilidade e marcha"],
    ["forca", "Força muscular"],
    ["fatoresAmbientais", "Fatores ambientais (apoio da família, equipamentos)"],
    ["objetivosFuncionais", "Objetivos funcionais discutidos com a família"],
  ],
  TO: [
    ["alimentacao", "Alimentação"],
    ["higiene", "Higiene pessoal"],
    ["vestuario", "Vestuário"],
    ["ortesesAdaptacoes", "Órteses e adaptações"],
  ],
} as const;

type EspecialidadeForm = keyof typeof CHECKLISTS;

export function ChecklistCifForm({
  ptsId,
  especialidade,
}: {
  ptsId: string;
  especialidade: EspecialidadeForm;
}) {
  const router = useRouter();
  const [marcados, setMarcados] = useState<Record<string, boolean>>({});
  const [cifGerada, setCifGerada] = useState<string[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [salvando, setSalvando] = useState(false);

  function alternar(item: string) {
    setOk(false);
    setMarcados((atual) => ({ ...atual, [item]: !atual[item] }));
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    setOk(false);
    setSalvando(true);

    const result = await criarAvaliacaoEspecialidade({
      ptsId,
      especialidade,
      dadosJson: marcados,
    });
    setSalvando(false);

    if (!result.ok) {
      setErro(result.erro ?? "Erro ao registrar avaliação.");
      return;
    }
    setOk(true);
    setCifGerada(result.cif);
    setMarcados({});
    router.refresh();
  }

  return (
    <form className="grid gap-4" onSubmit={onSubmit}>
      <fieldset className="grid gap-3 rounded-lg border p-4">
        <legend className="px-1 text-sm font-medium">
          {especialidade === "FISIO"
            ? "Checklist de avaliação — Fisioterapia"
            : "Checklist de avaliação — Terapia Ocupacional"}
        </legend>
        {CHECKLISTS[especialidade].map(([item, rotulo]) => (
          <label
            key={item}
            className="flex cursor-pointer items-center gap-3 rounded-md border p-3 text-sm hover:bg-muted/40"
          >
            <input
              type="checkbox"
              checked={Boolean(marcados[item])}
              onChange={() => alternar(item)}
              data-testid={`check-${item}`}
              className="h-4 w-4"
            />
            {rotulo}
          </label>
        ))}
      </fieldset>

      {erro ? (
        <p role="alert" className="text-destructive text-sm">
          {erro}
        </p>
      ) : null}
      {ok && cifGerada ? (
        <p role="status" data-testid="cif-ok" className="text-emerald-600 text-sm">
          Avaliação registrada. Códigos CIF gerados:{" "}
          {cifGerada.length > 0 ? cifGerada.join(", ") : "nenhum"}.
        </p>
      ) : null}

      <Button type="submit" disabled={salvando} className="justify-self-start">
        {especialidade === "FISIO" ? "Salvar avaliação Fisio" : "Salvar avaliação T.O."}
      </Button>
    </form>
  );
}
