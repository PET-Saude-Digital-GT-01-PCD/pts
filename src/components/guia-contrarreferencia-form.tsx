"use client";

import { useState, type FormEvent } from "react";

import { emitirContrarreferencia } from "@/server/triage/contrarreferencia";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function GuiaContrarreferenciaForm({
  pacienteId,
  ptsId,
  motivoInicial,
  onEmitida,
}: {
  pacienteId?: string;
  ptsId?: string;
  motivoInicial?: string;
  onEmitida?: (contrarreferenciaId: string) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [pending, setPending] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [emitidaId, setEmitidaId] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro(null);
    setPending(true);

    const form = new FormData(event.currentTarget);
    const destinoUbs = form.get("destinoUbs");
    const planoCuidados = form.get("planoCuidados");
    const r = await emitirContrarreferencia({
      pacienteId,
      ptsId,
      motivo: form.get("motivo"),
      destinoUbs:
        typeof destinoUbs === "string" && destinoUbs.trim()
          ? destinoUbs.trim()
          : undefined,
      planoCuidados:
        typeof planoCuidados === "string" && planoCuidados.trim()
          ? planoCuidados.trim()
          : undefined,
    });

    setPending(false);
    if (!r.ok) {
      setErro(r.erro);
      return;
    }
    setEmitidaId(r.contrarreferenciaId);
    onEmitida?.(r.contrarreferenciaId);
  }

  if (emitidaId) {
    return (
      <p className="text-sm text-emerald-600" data-testid="guia-emitida">
        Guia de contrarreferência emitida.{" "}
        <a
          href={`/contrarreferencia/${emitidaId}`}
          target="_blank"
          rel="noreferrer"
          className="underline"
        >
          Ver/imprimir
        </a>
      </p>
    );
  }

  if (!aberto) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setAberto(true)}
        data-testid="abrir-guia-contrarreferencia"
      >
        Emitir guia de contrarreferência
      </Button>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="grid gap-3 rounded-md border p-3"
      data-testid="form-contrarreferencia"
    >
      <div className="grid gap-2">
        <Label htmlFor="motivo-guia">Motivo / justificativa</Label>
        <textarea
          id="motivo-guia"
          name="motivo"
          rows={2}
          required
          maxLength={1000}
          defaultValue={motivoInicial}
          className="border-input bg-background rounded-md border px-3 py-2 text-sm"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="destinoUbs">UBS/APS de destino (opcional)</Label>
        <Input id="destinoUbs" name="destinoUbs" maxLength={120} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="planoCuidados">Plano de cuidados à APS (opcional)</Label>
        <textarea
          id="planoCuidados"
          name="planoCuidados"
          rows={3}
          maxLength={2000}
          defaultValue={motivoInicial ? `Resumo: ${motivoInicial}` : undefined}
          className="border-input bg-background rounded-md border px-3 py-2 text-sm"
        />
      </div>
      {erro && (
        <p role="alert" className="text-sm text-destructive">
          {erro}
        </p>
      )}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Emitindo…" : "Emitir guia"}
      </Button>
    </form>
  );
}
