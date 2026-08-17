"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  atualizarPapel,
  deletarPapel,
} from "@/server/iam/papeis";
import { RecursoMatriz, type RecursoOpcao } from "../recurso-matriz";

const BASES = ["CLINICO", "GESTOR", "ADMIN"] as const;

export function EditarPapelForm({
  papelId,
  nome,
  descricao,
  base,
  recursos,
  todas,
}: {
  papelId: string;
  nome: string;
  descricao: string | null;
  base: string;
  recursos: string[];
  todas: RecursoOpcao[];
}) {
  const router = useRouter();
  const [baseAtual, setBaseAtual] = useState(base);
  const [chaves, setChaves] = useState<string[]>(recursos);
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function salvar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    setOk(false);

    const form = new FormData(e.currentTarget);
    const result = await atualizarPapel(papelId, {
      nome: form.get("nome"),
      descricao: form.get("descricao") || undefined,
      base: baseAtual,
      recursos: chaves,
    });

    if (!result.ok) {
      setErro(result.erro ?? "Erro ao salvar.");
      return;
    }
    setOk(true);
    router.refresh();
  }

  async function excluir() {
    setErro(null);
    if (!confirm("Excluir este papel? Papéis em uso não podem ser excluídos.")) {
      return;
    }
    const result = await deletarPapel(papelId);
    if (!result.ok) {
      setErro(result.erro ?? "Erro ao excluir.");
      return;
    }
    router.push("/dashboard/papeis");
    router.refresh();
  }

  return (
    <form className="grid gap-4" onSubmit={salvar}>
      <div className="grid gap-2">
        <Label htmlFor="nome">Nome do papel</Label>
        <Input id="nome" name="nome" defaultValue={nome} required maxLength={60} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="descricao">Descrição</Label>
        <Input
          id="descricao"
          name="descricao"
          defaultValue={descricao ?? ""}
          maxLength={255}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="base">Base</Label>
        <select
          id="base"
          className="rounded-md border bg-background px-3 py-2 text-sm"
          value={baseAtual}
          onChange={(e) => setBaseAtual(e.target.value)}
        >
          {BASES.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
      </div>
      <RecursoMatriz
        recursos={todas}
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
          Alterações salvas.
        </p>
      ) : null}
      <div className="flex gap-2">
        <Button type="submit">Salvar</Button>
        <Button type="button" variant="destructive" onClick={excluir}>
          Excluir
        </Button>
      </div>
    </form>
  );
}