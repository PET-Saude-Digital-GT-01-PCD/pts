"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { criarPaciente } from "@/server/reception/paciente";
import { registrarCuidador } from "@/server/reception/cuidador";
import {
  registrarConsentimento,
  revogarConsentimento,
} from "@/server/reception/consentimento";
import { SecaoBaseline } from "@/components/reception/secao-baseline";
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
  const [pacienteId, setPacienteId] = useState<string | null>(null);

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

    setPacienteId(resultado.pacienteId);
  }

  if (pacienteId) {
    return (
      <div className="w-full max-w-lg space-y-6">
        <p className="text-sm text-muted-foreground">
          Paciente cadastrado. Complete as seções abaixo ou{" "}
          <ConcluirLink pacienteId={pacienteId} router={router} />.
        </p>
        <SecaoBaseline pacienteId={pacienteId} />
        <SecaoCuidador pacienteId={pacienteId} />
        <SecaoConsentimento pacienteId={pacienteId} />
        <Button onClick={() => router.push(`/pacientes/${pacienteId}`)}>
          Ir para o paciente
        </Button>
      </div>
    );
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

function ConcluirLink({
  pacienteId,
  router,
}: {
  pacienteId: string;
  router: ReturnType<typeof useRouter>;
}) {
  return (
    <button
      type="button"
      className="underline"
      onClick={() => router.push(`/pacientes/${pacienteId}`)}
    >
      siga para o paciente
    </button>
  );
}

function SecaoCuidador({ pacienteId }: { pacienteId: string }) {
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

function SecaoConsentimento({ pacienteId }: { pacienteId: string }) {
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
