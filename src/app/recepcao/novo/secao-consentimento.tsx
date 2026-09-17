"use client";

import { useState, type FormEvent } from "react";

import {
  registrarConsentimento,
  revogarConsentimento,
} from "@/server/reception/consentimento";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SecaoConsentimento({ pacienteId }: { pacienteId: string }) {
  const [erro, setErro] = useState<string | null>(null);
  const [consentimentoId, setConsentimentoId] = useState<string | null>(null);
  const [revogado, setRevogado] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro(null);
    setPending(true);

    const form = new FormData(event.currentTarget);
    const resultado = await registrarConsentimento({
      pacienteId,
      termoVersao: form.get("termoVersao"),
      canal: form.get("canal"),
      assinaturaRef: form.get("assinaturaRef") || undefined,
    });

    if (!resultado.ok) {
      setErro(resultado.erro);
      setPending(false);
      return;
    }

    setConsentimentoId(resultado.consentimentoId);
    setPending(false);
  }

  async function onRevogar() {
    if (!consentimentoId) return;
    setErro(null);
    setPending(true);
    const resultado = await revogarConsentimento({ consentimentoId });
    if (!resultado.ok) {
      setErro(resultado.erro);
      setPending(false);
      return;
    }
    setRevogado(true);
    setPending(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Consentimento LGPD</CardTitle>
        <CardDescription>
          Registro append-only. Revogação preserva o histórico.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4" onSubmit={onSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="termoVersao">Versão do termo</Label>
              <Input id="termoVersao" name="termoVersao" defaultValue="v1" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="canal">Canal</Label>
              <select
                id="canal"
                name="canal"
                required
                className="border-input bg-background flex h-9 w-full rounded-md border px-3 text-sm"
              >
                <option value="TABLET">Tablet</option>
                <option value="WHATSAPP">WhatsApp</option>
                <option value="GOVBR">Gov.br</option>
              </select>
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="assinaturaRef">Referência de assinatura (opcional)</Label>
            <Input id="assinaturaRef" name="assinaturaRef" />
          </div>
          {erro ? (
            <p role="alert" className="text-sm text-destructive">
              {erro}
            </p>
          ) : null}
          {revogado ? (
            <p className="text-warning text-sm">Consentimento revogado.</p>
          ) : null}
          {consentimentoId && !revogado ? (
            <Button
              type="button"
              variant="outline"
              className="text-destructive"
              onClick={onRevogar}
              disabled={pending}
            >
              Revogar consentimento
            </Button>
          ) : (
            <Button type="submit" variant="outline" disabled={pending}>
              {consentimentoId ? "Registrado" : pending ? "Salvando…" : "Registrar consentimento"}
            </Button>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
