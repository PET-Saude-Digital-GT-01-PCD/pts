"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { criarAvaliacaoSoap } from "@/server/clinical/soap";

type ItemGrade = { servico: string; frequencia: string; duracao: string; justificativa: string };

const ITEM_VAZIO: ItemGrade = {
  servico: "",
  frequencia: "",
  duracao: "",
  justificativa: "",
};

export function SoapForm({ ptsId }: { ptsId: string }) {
  const router = useRouter();
  const [grade, setGrade] = useState<ItemGrade[]>([{ ...ITEM_VAZIO }]);
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [salvando, setSalvando] = useState(false);

  function atualizarItem(i: number, campo: keyof ItemGrade, valor: string) {
    setGrade((g) => g.map((item, j) => (j === i ? { ...item, [campo]: valor } : item)));
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
      },
    });
    setSalvando(false);

    if (!result.ok) {
      setErro(result.erro ?? "Erro ao registrar avaliação.");
      return;
    }
    setOk(true);
    setGrade([{ ...ITEM_VAZIO }]);
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

      <fieldset className="grid gap-3 rounded-lg border p-4">
        <legend className="px-1 text-sm font-medium">Plano — grade de serviços</legend>
        {grade.map((item, i) => (
          <div key={i} className="grid gap-2 rounded-md border p-3 sm:grid-cols-2">
            <div className="grid gap-1">
              <Label htmlFor={`servico-${i}`}>Serviço</Label>
              <Input
                id={`servico-${i}`}
                value={item.servico}
                onChange={(e) => atualizarItem(i, "servico", e.target.value)}
              />
            </div>
            <div className="grid gap-1">
              <Label htmlFor={`frequencia-${i}`}>Frequência</Label>
              <Input
                id={`frequencia-${i}`}
                placeholder="ex.: 2x/semana"
                value={item.frequencia}
                onChange={(e) => atualizarItem(i, "frequencia", e.target.value)}
              />
            </div>
            <div className="grid gap-1">
              <Label htmlFor={`duracao-${i}`}>Duração</Label>
              <Input
                id={`duracao-${i}`}
                placeholder="ex.: 12 semanas"
                value={item.duracao}
                onChange={(e) => atualizarItem(i, "duracao", e.target.value)}
              />
            </div>
            <div className="grid gap-1">
              <Label htmlFor={`justificativa-${i}`}>Justificativa</Label>
              <Input
                id={`justificativa-${i}`}
                value={item.justificativa}
                onChange={(e) => atualizarItem(i, "justificativa", e.target.value)}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              className="justify-self-start"
              onClick={() => setGrade((g) => g.filter((_, j) => j !== i))}
              disabled={grade.length === 1}
            >
              Remover item
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          className="justify-self-start"
          onClick={() => setGrade((g) => [...g, { ...ITEM_VAZIO }])}
        >
          Adicionar serviço
        </Button>
      </fieldset>

      {erro ? (
        <p role="alert" className="text-sm text-destructive">
          {erro}
        </p>
      ) : null}
      {ok ? (
        <p role="status" data-testid="soap-ok" className="text-sm text-emerald-600">
          Avaliação registrada.
        </p>
      ) : null}

      <Button type="submit" disabled={salvando} className="justify-self-start">
        Salvar avaliação SOAP
      </Button>
    </form>
  );
}
