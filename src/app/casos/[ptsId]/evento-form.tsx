"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { registrarEvento } from "@/server/care-plan/eventos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ROTULOS_TIPO: Record<string, string> = {
  SESSAO: "Sessão",
  FALTA: "Falta",
  CANCELAMENTO: "Cancelamento",
  OUTRO: "Outro",
};

export function EventoForm({ ptsId }: { ptsId: string }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const hoje = new Date().toISOString().slice(0, 10);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro(null);
    setPending(true);

    const form = new FormData(event.currentTarget);
    const observacao = form.get("observacao");
    const r = await registrarEvento({
      ptsId,
      tipo: form.get("tipo"),
      data: form.get("data"),
      observacao:
        typeof observacao === "string" && observacao.trim()
          ? observacao.trim()
          : undefined,
    });

    setPending(false);
    if (!r.ok) {
      setErro(r.erro);
      return;
    }
    setAberto(false);
    router.refresh();
  }

  if (!aberto) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setAberto(true)}
        data-testid="abrir-form-evento"
      >
        Registrar evento
      </Button>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="grid gap-3 rounded-md border p-3"
      data-testid="form-evento"
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="grid gap-2">
          <Label htmlFor="tipo-evento">Tipo</Label>
          <select
            id="tipo-evento"
            name="tipo"
            className="border-input bg-background flex h-9 w-full rounded-md border px-3 text-sm"
            defaultValue="SESSAO"
          >
            {Object.entries(ROTULOS_TIPO).map(([valor, rotulo]) => (
              <option key={valor} value={valor}>
                {rotulo}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="data-evento">Data</Label>
          <Input id="data-evento" name="data" type="date" required defaultValue={hoje} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="observacao-evento">Observação (opcional)</Label>
          <Input id="observacao-evento" name="observacao" maxLength={500} />
        </div>
      </div>
      {erro && (
        <p role="alert" className="text-sm text-destructive">
          {erro}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Salvando…" : "Salvar evento"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setAberto(false)}
          disabled={pending}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}
