"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { criarPaciente } from "@/server/reception/paciente";
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

export function NovoPacienteForm({
  documentoInicial,
}: {
  documentoInicial: string;
}) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const docInicialLimpo = documentoInicial.replace(/\D+/g, "");
  const prefillCpf = docInicialLimpo.length === 11 ? documentoInicial : "";
  const prefillCns = docInicialLimpo.length === 15 ? documentoInicial : "";

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro(null);
    setPending(true);

    const form = new FormData(event.currentTarget);
    const resultado = await criarPaciente({
      nome: form.get("nome"),
      cpf: form.get("cpf") ?? undefined,
      cns: form.get("cns") ?? undefined,
      dtnasc: form.get("dtnasc"),
      sexo: form.get("sexo"),
      enderecoJson: form.get("endereco")
        ? { logradouro: form.get("endereco") }
        : undefined,
    });

    if (!resultado.ok) {
      setErro(resultado.erro);
      setPending(false);
      return;
    }

    router.push(`/pacientes/${resultado.pacienteId}`);
  }

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>Novo paciente</CardTitle>
        <CardDescription>Cadastro no CER do seu vínculo.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4" onSubmit={onSubmit}>
          <div className="grid gap-2">
            <Label htmlFor="nome">Nome completo</Label>
            <Input id="nome" name="nome" required minLength={3} maxLength={120} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="cpf">CPF</Label>
              <Input
                id="cpf"
                name="cpf"
                inputMode="numeric"
                defaultValue={prefillCpf}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cns">CNS</Label>
              <Input
                id="cns"
                name="cns"
                inputMode="numeric"
                defaultValue={prefillCns}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="dtnasc">Data de nascimento</Label>
              <Input id="dtnasc" name="dtnasc" type="date" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sexo">Sexo</Label>
              <select
                id="sexo"
                name="sexo"
                required
                className="border-input bg-background flex h-9 w-full rounded-md border px-3 text-sm"
              >
                <option value="MASCULINO">Masculino</option>
                <option value="FEMININO">Feminino</option>
                <option value="OUTRO">Outro</option>
              </select>
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="endereco">Endereço (opcional)</Label>
            <Input id="endereco" name="endereco" autoComplete="street-address" />
          </div>
          {erro ? (
            <p role="alert" className="text-sm text-destructive">
              {erro}
            </p>
          ) : null}
          <Button type="submit" disabled={pending}>
            {pending ? "Salvando…" : "Cadastrar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
