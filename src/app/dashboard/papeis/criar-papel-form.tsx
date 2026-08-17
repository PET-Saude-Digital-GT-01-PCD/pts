"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { criarPapel } from "@/server/iam/papeis";
import { RecursoMatriz, type RecursoOpcao } from "./recurso-matriz";

const BASES = ["CLINICO", "GESTOR", "ADMIN"] as const;

export function CriarPapelForm({ recursos }: { recursos: RecursoOpcao[] }) {
  const [base, setBase] = useState<string>("CLINICO");
  const [chaves, setChaves] = useState<string[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    setOk(false);

    const form = new FormData(e.currentTarget);
    const result = await criarPapel({
      nome: form.get("nome"),
      descricao: form.get("descricao") || undefined,
      base,
      recursos: chaves,
    });

    if (!result.ok) {
      setErro(result.erro ?? "Erro ao criar papel.");
      return;
    }
    setOk(true);
  }

  return (
    <form className="grid gap-4" onSubmit={onSubmit}>
      <div className="grid gap-2">
        <Label htmlFor="nome">Nome do papel</Label>
        <Input id="nome" name="nome" required maxLength={60} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="descricao">Descrição</Label>
        <Input id="descricao" name="descricao" maxLength={255} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="base">Base</Label>
        <select
          id="base"
          className="rounded-md border bg-background px-3 py-2 text-sm"
          value={base}
          onChange={(e) => setBase(e.target.value)}
        >
          {BASES.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
      </div>
      <RecursoMatriz
        recursos={recursos}
        selecionados={chaves}
        onChange={setChaves}
      />
      {erro ? (
        <p role="alert" className="text-sm text-destructive">
          {erro}
        </p>
      ) : null}
      {ok ? (
        <p role="status" className="text-sm text-emerald-600">
          Papel criado.
        </p>
      ) : null}
      <Button type="submit">Criar papel</Button>
    </form>
  );
}