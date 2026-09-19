"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { criarAvaliacaoSoap } from "@/server/clinical/soap";
import {
  GRUPOS_ASHWORTH,
  type GrupoAshworth,
  type ValoresAshworth,
  type ValoresGlasgow,
} from "@/server/clinical/escalas";
import { FieldsetEscalasClinicas } from "./fieldset-escalas-clinicas";
import { FieldsetGradeServicos, type ItemGrade } from "./fieldset-grade-servicos";
import { FieldsetDivergencia, CAMPOS_RELATO, CAMPOS_MEDIDOS } from "./fieldset-divergencia";

const ITEM_VAZIO: ItemGrade = {
  servico: "",
  frequencia: "",
  duracao: "",
  justificativa: "",
};

const ASHWORTH_VAZIO: ValoresAshworth = Object.fromEntries(
  GRUPOS_ASHWORTH.map((g) => [g, null]),
) as ValoresAshworth;

const GLASGOW_VAZIO: ValoresGlasgow = { ocular: null, verbal: null, motor: null };

function escalasForm(
  form: FormData,
  campos: readonly (readonly [string, string])[],
) {
  const valores: Record<string, number | null> = {};
  for (const [nome] of campos) {
    const bruto = String(form.get(nome) ?? "").trim();
    valores[nome] = bruto === "" ? null : Number(bruto);
  }
  return valores;
}

export function SoapForm({ ptsId }: { ptsId: string }) {
  const router = useRouter();
  const [grade, setGrade] = useState<ItemGrade[]>([{ ...ITEM_VAZIO }]);
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [ashworth, setAshworth] = useState<ValoresAshworth>({ ...ASHWORTH_VAZIO });
  const [glasgow, setGlasgow] = useState<ValoresGlasgow>({ ...GLASGOW_VAZIO });

  function atualizarItem(i: number, campo: keyof ItemGrade, valor: string) {
    setGrade((g) => g.map((item, j) => (j === i ? { ...item, [campo]: valor } : item)));
  }

  function atualizarAshworth(grupo: GrupoAshworth, valor: string) {
    setAshworth((a) => ({ ...a, [grupo]: valor === "" ? null : Number(valor) }));
  }

  function atualizarGlasgow(campo: keyof ValoresGlasgow, valor: string) {
    setGlasgow((g) => ({ ...g, [campo]: valor === "" ? null : Number(valor) }));
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    setOk(false);
    setSalvando(true);

    const form = new FormData(e.currentTarget);
    const gradePreenchida = grade.filter((item) =>
      Object.values(item).some((v) => v.trim() !== ""),
    );
    const result = await criarAvaliacaoSoap({
      ptsId,
      dadosJson: {
        subjetivo: form.get("subjetivo"),
        objetivo: form.get("objetivo"),
        avaliacao: form.get("avaliacao"),
        plano: { gradeServicos: gradePreenchida },
        relato: escalasForm(form, CAMPOS_RELATO),
        avaliacaoClinica: escalasForm(form, CAMPOS_MEDIDOS),
        escalasObjetivo: { ashworth, glasgow },
      },
    });
    setSalvando(false);

    if (!result.ok) {
      setErro(result.erro ?? "Erro ao registrar avaliação.");
      return;
    }
    setOk(true);
    setGrade([{ ...ITEM_VAZIO }]);
    setAshworth({ ...ASHWORTH_VAZIO });
    setGlasgow({ ...GLASGOW_VAZIO });
    (e.target as HTMLFormElement).reset();
    router.refresh();
  }

  return (
    <form className="grid gap-4" onSubmit={onSubmit}>
      {(["subjetivo", "objetivo", "avaliacao"] as const).map((campo) => (
        <div key={campo} className="grid gap-2">
          <Label htmlFor={campo}>{campo[0].toUpperCase() + campo.slice(1)}</Label>
          <textarea
            id={campo}
            name={campo}
            required
            rows={3}
            className="rounded-md border bg-background px-3 py-2 text-sm"
          />
        </div>
      ))}

      <FieldsetEscalasClinicas
        ashworth={ashworth}
        glasgow={glasgow}
        onAtualizarAshworth={atualizarAshworth}
        onAtualizarGlasgow={atualizarGlasgow}
      />

      <FieldsetGradeServicos
        grade={grade}
        onAtualizarItem={atualizarItem}
        onAdicionarItem={() => setGrade((g) => [...g, { ...ITEM_VAZIO }])}
        onRemoverItem={(i) => setGrade((g) => g.filter((_, j) => j !== i))}
      />

      <FieldsetDivergencia />

      {erro ? (
        <p role="alert" className="text-sm text-destructive">
          {erro}
        </p>
      ) : null}
      {ok ? (
        <p role="status" data-testid="soap-ok" className="text-sm font-medium text-success">
          Avaliação registrada.
        </p>
      ) : null}

      <Button type="submit" loading={salvando} className="justify-self-start">
        Salvar avaliação SOAP
      </Button>
    </form>
  );
}
