"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { ajustarClassificacao } from "@/server/triage/registrar";
import type { Semaforo } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AjusteForm({
  triagemId,
  vigente,
}: {
  triagemId: string;
  vigente: Semaforo;
}) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [aberto, setAberto] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro(null);
    setPending(true);

    const form = new FormData(event.currentTarget);

    let resultado;
    try {
      resultado = await ajustarClassificacao({
        triagemId,
        para: form.get("para"),
        motivo: form.get("motivo"),
      });
    } catch {
      setErro("Falha inesperada no servidor ao ajustar classificação.");
      setPending(false);
      return;
    }

    if (!resultado.ok) {
      setErro(resultado.erro);
      setPending(false);
      return;
    }

    setPending(false);
    router.refresh();
  }

  if (!aberto) {
    return (
      <Button variant="outline" onClick={() => setAberto(true)}>
        Ajustar classificação
      </Button>
    );
  }

  return (
    <form className="grid gap-3" onSubmit={onSubmit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="para">Nova classificação</Label>
          <select
            id="para"
            name="para"
            className="border-input bg-background flex h-9 w-full rounded-md border px-3 text-sm"
            defaultValue={vigente}
          >
            <option value="VERDE">Verde</option>
            <option value="AMARELO">Amarelo</option>
            <option value="VERMELHO">Vermelho</option>
          </select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="motivo-ajuste">Motivo (obrigatório)</Label>
          <Input id="motivo-ajuste" name="motivo" required maxLength={500} />
        </div>
      </div>
      {erro ? (
        <p role="alert" className="text-sm text-destructive">
          {erro}
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Salvando…" : "Confirmar ajuste"}
      </Button>
    </form>
  );
}
