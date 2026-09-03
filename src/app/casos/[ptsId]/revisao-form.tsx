"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registrarRevisao } from "@/server/care-plan/revisao";

export function RevisaoForm({ ptsId }: { ptsId: string }) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState<number | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    setOk(null);
    setSalvando(true);

    const form = new FormData(e.currentTarget);
    const result = await registrarRevisao({
      ptsId,
      motivo: form.get("motivo"),
    });
    setSalvando(false);

    if (!result.ok) {
      setErro(result.erro);
      return;
    }
    setOk(result.numero);
    (e.target as HTMLFormElement).reset();
    router.refresh();
  }

  return (
    <form className="grid gap-3 rounded-lg border p-4" onSubmit={onSubmit}>
      <div className="grid gap-2">
        <Label htmlFor="motivo-revisao">Motivo da revisão</Label>
        <Input
          id="motivo-revisao"
          name="motivo"
          required
          maxLength={500}
          placeholder="ex.: reunião de reavaliação trimestral"
        />
      </div>
      {erro ? (
        <p role="alert" className="text-sm text-destructive">
          {erro}
        </p>
      ) : null}
      {ok !== null ? (
        <p role="status" data-testid="revisao-ok" className="text-sm text-emerald-600">
          Revisão #{ok} registrada.
        </p>
      ) : null}
      <Button type="submit" disabled={salvando} className="justify-self-start">
        {salvando ? "Registrando…" : "Registrar revisão"}
      </Button>
    </form>
  );
}
