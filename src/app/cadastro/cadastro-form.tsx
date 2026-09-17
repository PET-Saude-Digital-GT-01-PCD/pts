"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";

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
import { autoCadastrar } from "@/server/iam/admissao";
import type { CampoFormularioConfig } from "@/server/iam/formulario-config";

const CATEGORIA_LABEL: Record<string, string> = {
  RECEPCAO: "Recepção",
  TRIADOR: "Triador",
  MEDICO: "Médico",
  FISIOTERAPEUTA: "Fisioterapeuta",
  TERAPEUTA_OCUPACIONAL: "Terapeuta Ocupacional",
  PSICOLOGO: "Psicólogo",
  ENFERMEIRO: "Enfermeiro",
};

function CampoDinamico({ campo }: { campo: CampoFormularioConfig }) {
  const id = `campo-${campo.campo}`;
  if (campo.tipo === "BOOLEANO") {
    return (
      <div className="flex items-center gap-2">
        <input id={id} name={campo.campo} type="checkbox" className="h-4 w-4" />
        <Label htmlFor={id}>
          {campo.rotulo}
          {campo.obrigatorio ? " *" : ""}
        </Label>
      </div>
    );
  }
  if (campo.tipo === "SELECT") {
    return (
      <div className="grid gap-2">
        <Label htmlFor={id}>
          {campo.rotulo}
          {campo.obrigatorio ? " *" : ""}
        </Label>
        <select
          id={id}
          name={campo.campo}
          required={campo.obrigatorio}
          defaultValue=""
          className="border-input bg-background flex h-9 w-full rounded-md border px-3 text-sm"
        >
          <option value="" disabled>
            Selecione…
          </option>
          {(campo.opcoes ?? []).map((op) => (
            <option key={op} value={op}>
              {op}
            </option>
          ))}
        </select>
      </div>
    );
  }
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>
        {campo.rotulo}
        {campo.obrigatorio ? " *" : ""}
      </Label>
      <Input
        id={id}
        name={campo.campo}
        type={campo.tipo === "NUMERO" ? "number" : "text"}
        required={campo.obrigatorio}
      />
    </div>
  );
}

export function CadastroForm({ campos }: { campos: CampoFormularioConfig[] }) {
  const [erro, setErro] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [enviado, setEnviado] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro(null);
    setPending(true);

    const form = new FormData(event.currentTarget);
    const camposDinamicos: Record<string, unknown> = {};
    for (const c of campos) {
      if (c.tipo === "BOOLEANO") {
        camposDinamicos[c.campo] = form.get(c.campo) === "on";
      } else {
        camposDinamicos[c.campo] = form.get(c.campo) ?? undefined;
      }
    }

    const resultado = await autoCadastrar({
      nome: form.get("nome"),
      email: form.get("email"),
      senha: form.get("senha"),
      categoria: form.get("categoria"),
      camposDinamicos,
    });
    setPending(false);

    if (!resultado.ok) {
      setErro(resultado.erro);
      return;
    }
    setEnviado(true);
  }

  if (enviado) {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Cadastro enviado</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p role="status" className="text-sm text-muted-foreground">
            Seu cadastro foi enviado e aguarda aprovação do administrador do
            CER. Você receberá acesso assim que for aprovado.
          </p>
          <Link className="text-sm underline" href="/login">
            Voltar para o login
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Solicitar acesso</CardTitle>
        <CardDescription>
          Cadastro fica pendente até aprovação do administrador.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4" onSubmit={onSubmit}>
          <div className="grid gap-2">
            <Label htmlFor="nome">Nome completo</Label>
            <Input id="nome" name="nome" required minLength={3} maxLength={120} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" name="email" type="email" autoComplete="username" required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="senha">Senha</Label>
            <Input
              id="senha"
              name="senha"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="categoria">Categoria profissional</Label>
            <select
              id="categoria"
              name="categoria"
              required
              defaultValue=""
              className="border-input bg-background flex h-9 w-full rounded-md border px-3 text-sm"
            >
              <option value="" disabled>
                Selecione…
              </option>
              {Object.entries(CATEGORIA_LABEL).map(([valor, rotulo]) => (
                <option key={valor} value={valor}>
                  {rotulo}
                </option>
              ))}
            </select>
          </div>

          {campos.map((campo) => (
            <CampoDinamico key={campo.campo} campo={campo} />
          ))}

          {erro ? (
            <p role="alert" className="text-sm text-destructive">
              {erro}
            </p>
          ) : null}
          <Button type="submit" disabled={pending}>
            {pending ? "Enviando…" : "Solicitar acesso"}
          </Button>
          <Link className="text-center text-sm underline" href="/login">
            Já tenho conta
          </Link>
        </form>
      </CardContent>
    </Card>
  );
}
