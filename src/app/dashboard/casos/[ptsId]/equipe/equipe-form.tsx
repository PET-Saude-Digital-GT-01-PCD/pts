"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  adicionarMembroEquipe,
  removerMembroEquipe,
  type DetalheEquipeCaso,
} from "@/server/care-plan/equipe";

export function EquipeForm({ detalhe }: { detalhe: DetalheEquipeCaso }) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onAdicionar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro(null);
    setPending(true);

    const form = new FormData(event.currentTarget);
    const resultado = await adicionarMembroEquipe({
      ptsId: detalhe.ptsId,
      usuarioId: form.get("usuarioId"),
      papelNoCaso: form.get("papelNoCaso"),
    });
    setPending(false);

    if (!resultado.ok) {
      setErro(resultado.erro);
      return;
    }
    (event.target as HTMLFormElement).reset();
    router.refresh();
  }

  async function onRemover(usuarioId: string) {
    setErro(null);
    setPending(true);
    const resultado = await removerMembroEquipe({ ptsId: detalhe.ptsId, usuarioId });
    setPending(false);

    if (!resultado.ok) {
      setErro(resultado.erro);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Equipe atual</CardTitle>
        </CardHeader>
        <CardContent>
          {detalhe.membros.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum profissional vinculado além da referência.
            </p>
          ) : (
            <ul className="divide-y" data-testid="lista-equipe">
              {detalhe.membros.map((m) => (
                <li
                  key={m.usuarioId}
                  data-testid="membro-equipe"
                  className="flex items-center justify-between gap-4 py-3"
                >
                  <div>
                    <p className="font-medium">{m.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {m.papelNoCaso}
                      {m.categoria ? ` · ${m.categoria}` : ""}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-destructive"
                    onClick={() => onRemover(m.usuarioId)}
                    disabled={pending}
                  >
                    Remover
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Adicionar à equipe</CardTitle>
        </CardHeader>
        <CardContent>
          {detalhe.disponiveis.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum profissional disponível para adicionar.
            </p>
          ) : (
            <form className="grid gap-4" onSubmit={onAdicionar}>
              <div className="grid gap-2">
                <Label htmlFor="usuarioId">Profissional</Label>
                <select
                  id="usuarioId"
                  name="usuarioId"
                  required
                  defaultValue=""
                  className="border-input bg-background flex h-9 w-full rounded-md border px-3 text-sm"
                >
                  <option value="" disabled>
                    Selecione…
                  </option>
                  {detalhe.disponiveis.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome}
                      {p.categoria ? ` (${p.categoria})` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="papelNoCaso">Papel no caso</Label>
                <Input
                  id="papelNoCaso"
                  name="papelNoCaso"
                  placeholder="ex.: Fisioterapia — reabilitação motora"
                  required
                  maxLength={120}
                />
              </div>
              {erro ? (
                <p role="alert" className="text-sm text-destructive">
                  {erro}
                </p>
              ) : null}
              <Button type="submit" disabled={pending} className="justify-self-start">
                {pending ? "Adicionando…" : "Adicionar"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
