"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const [classificacaoLivre, setClassificacaoLivre] = useState("");
  const [classificacoesLivres, setClassificacoesLivres] = useState<string[]>([]);
  const [cifGerada, setCifGerada] = useState<string[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [salvando, setSalvando] = useState(false);

  function alternar(item: string) {
    setOk(false);
    setMarcados((atual) => ({ ...atual, [item]: !atual[item] }));
  }

  function adicionarClassificacaoLivre() {
    const classificacao = classificacaoLivre.trim();
    if (!classificacao) return;

    if (
      classificacoesLivres.some(
        (item) =>
          item.localeCompare(classificacao, "pt-BR", { sensitivity: "accent" }) ===
          0,
      )
    ) {
      setErro("Esta classificação já foi adicionada.");
      return;
    }

    if (classificacoesLivres.length === 20) {
      setErro("Adicione no máximo 20 classificações livres por avaliação.");
      return;
    }

    setErro(null);
    setClassificacoesLivres((atual) => [...atual, classificacao]);
    setClassificacaoLivre("");
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    setOk(false);
    setSalvando(true);

    const result = await criarAvaliacaoEspecialidade({
      ptsId,
      especialidade,
      dadosJson: {
        ...marcados,
        ...(especialidade === "FISIO" && classificacoesLivres.length > 0
          ? { classificacoesLivres }
          : {}),
      },
    });
    setSalvando(false);

    if (!result.ok) {
      setErro(result.erro ?? "Erro ao registrar avaliação.");
      return;
    }
    setOk(true);
    setCifGerada(result.cif);
    setMarcados({});
    setClassificacoesLivres([]);
    setClassificacaoLivre("");
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

        {especialidade === "FISIO" ? (
          <div className="grid gap-2 border-t pt-3">
            <label
              htmlFor="classificacao-livre"
              className="text-sm font-medium"
            >
              Classificação livre
            </label>
            <p className="text-xs text-muted-foreground">
              Registre uma condição observada que não esteja na checklist. Esse
              texto não gera código CIF automaticamente.
            </p>
            <div className="flex gap-2">
              <Input
                id="classificacao-livre"
                value={classificacaoLivre}
                maxLength={500}
                placeholder="Ex.: padrão de marcha assimétrico"
                onChange={(event) => setClassificacaoLivre(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    adicionarClassificacaoLivre();
                  }
                }}
                disabled={salvando}
              />
              <Button
                type="button"
                variant="outline"
                onClick={adicionarClassificacaoLivre}
                disabled={salvando}
              >
                Adicionar
              </Button>
            </div>
            {classificacoesLivres.length > 0 ? (
              <ul
                className="flex flex-wrap gap-2"
                aria-label="Classificações livres adicionadas"
              >
                {classificacoesLivres.map((classificacao) => (
                  <li
                    key={classificacao}
                    className="flex items-center gap-1 rounded-md border px-2 py-1 text-sm"
                  >
                    {classificacao}
                    <button
                      type="button"
                      onClick={() =>
                        setClassificacoesLivres((atual) =>
                          atual.filter((item) => item !== classificacao),
                        )
                      }
                      className="text-muted-foreground hover:text-foreground"
                      aria-label={`Remover classificação ${classificacao}`}
                      disabled={salvando}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </fieldset>

      {erro ? (
        <p role="alert" className="text-destructive text-sm">
          {erro}
        </p>
      ) : null}
      {ok && cifGerada ? (
        <p role="status" data-testid="cif-ok" className="text-success text-sm font-medium">
          Avaliação registrada. Códigos CIF gerados:{" "}
          {cifGerada.length > 0 ? cifGerada.join(", ") : "nenhum"}.
        </p>
      ) : null}

      <Button type="submit" loading={salvando} className="justify-self-start">
        {especialidade === "FISIO" ? "Salvar avaliação Fisio" : "Salvar avaliação T.O."}
      </Button>
    </form>
  );
}
