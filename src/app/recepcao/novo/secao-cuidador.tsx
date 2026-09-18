"use client";

import { useState, type FormEvent } from "react";

import { registrarCuidador } from "@/server/reception/cuidador";

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

export function SecaoCuidador({ pacienteId }: { pacienteId: string }) {
  const [erro, setErro] = useState<string | null>(null);
  const [zaritAltoAviso, setZaritAltoAviso] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro(null);
    setPending(true);

    const form = new FormData(event.currentTarget);
    const idade = form.get("idade");
    const zarit = form.get("zaritScore");
    const resultado = await registrarCuidador({
      pacienteId,
      nome: form.get("nome"),
      parentesco: form.get("parentesco"),
      idade: idade ? Number(idade) : undefined,
      zaritScore: zarit === "" ? undefined : Number(zarit),
    });

    if (!resultado.ok) {
      setErro(resultado.erro);
      setPending(false);
      return;
    }

    setZaritAltoAviso(resultado.zaritAlto);
    setSalvo(true);
    setPending(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cuidador</CardTitle>
        <CardDescription>Mapeamento biopsicossocial e Zarit.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4" onSubmit={onSubmit}>
          <div className="grid gap-2">
            <Label htmlFor="cuidador-nome">Nome do cuidador</Label>
            <Input id="cuidador-nome" name="nome" required minLength={3} />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="parentesco">Parentesco</Label>
              <Input id="parentesco" name="parentesco" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="idade">Idade</Label>
              <Input id="idade" name="idade" type="number" min={0} max={120} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="zaritScore">Zarit (0–24)</Label>
              <Input
                id="zaritScore"
                name="zaritScore"
                type="number"
                min={0}
                max={24}
              />
            </div>
          </div>
          {zaritAltoAviso ? (
            <p
              role="alert"
              data-testid="zarit-alto"
              className="text-destructive rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm font-medium"
            >
              Zarit ALTO: sobrecarga intensa do cuidador. Encaminhar ao Serviço
              Social.
            </p>
          ) : null}
          {erro ? (
            <p role="alert" className="text-sm text-destructive">
              {erro}
            </p>
          ) : null}
          <Button type="submit" variant="outline" disabled={pending || salvo}>
            {salvo ? "Cuidador salvo" : pending ? "Salvando…" : "Registrar cuidador"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
