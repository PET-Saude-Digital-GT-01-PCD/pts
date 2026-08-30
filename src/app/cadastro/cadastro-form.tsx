"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import type { TipoCampo } from "@prisma/client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/ui/logo";
import { autocadastrar } from "@/server/iam/cadastro";

export type CampoConfig = {
  campo: string;
  rotulo: string;
  tipo: TipoCampo;
  obrigatorio: boolean;
  opcoesJson: unknown;
};

function renderCampo(c: CampoConfig) {
  const baseProps = {
    id: `campo-${c.campo}`,
    name: c.campo,
    required: c.obrigatorio,
    className: "w-full",
  };

  switch (c.tipo) {
    case "SELECAO": {
      const opcoes = Array.isArray(c.opcoesJson) ? (c.opcoesJson as string[]) : [];
      return (
        <select
          {...baseProps}
          defaultValue=""
          className="rounded-md border bg-background px-3 py-2 text-sm w-full"
        >
          <option value="" disabled>
            Selecione…
          </option>
          {opcoes.map((op) => (
            <option key={op} value={op}>
              {op.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      );
    }
    case "BOOLEAN":
      return (
        <input
          {...baseProps}
          type="checkbox"
          className="h-4 w-4"
        />
      );
    case "NUMERO":
      return <Input {...baseProps} type="number" />;
    case "DATA":
      return <Input {...baseProps} type="date" />;
    default: {
      // TEXTO — campo senha usa type=password
      const isPassword = c.campo === "senha";
      const isEmail = c.campo === "email";
      return (
        <Input
          {...baseProps}
          type={isPassword ? "password" : isEmail ? "email" : "text"}
          autoComplete={
            isPassword ? "new-password" : isEmail ? "email" : undefined
          }
          minLength={isPassword ? 6 : undefined}
        />
      );
    }
  }
}

export function CadastroForm({
  cerId,
  campos,
}: {
  cerId: string;
  campos: CampoConfig[];
}) {
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro(null);
    setPending(true);

    const form = new FormData(event.currentTarget);
    const payload: Record<string, string> = {};
    for (const [key, value] of form.entries()) {
      payload[key] = value.toString();
    }

    const result = await autocadastrar(cerId, payload);

    if (!result.ok) {
      setErro(result.erro ?? "Erro inesperado.");
      setPending(false);
      return;
    }

    setSucesso(true);
    setPending(false);
  }

  if (sucesso) {
    return (
      <Card className="w-full max-w-sm" data-testid="cadastro-sucesso">
        <CardHeader className="items-center text-center">
          <Logo />
          <CardTitle>Cadastro enviado!</CardTitle>
          <CardDescription>
            Seu cadastro foi recebido e está aguardando aprovação do administrador.
            Você receberá uma confirmação assim que seu acesso for liberado.
          </CardDescription>
        </CardHeader>
        <CardFooter className="justify-center">
          <Button asChild variant="outline">
            <Link href="/login">Ir para o login</Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="items-center text-center">
        <Logo />
        <CardTitle>Solicitar acesso</CardTitle>
        <CardDescription>
          Preencha o formulário para solicitar acesso ao sistema.
          Seu cadastro passará por aprovação do administrador.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form id="cadastro-form" className="grid gap-4" onSubmit={onSubmit}>
          {campos.map((c) => (
            <div key={c.campo} className="grid gap-2">
              <Label htmlFor={`campo-${c.campo}`}>
                {c.rotulo}
                {c.obrigatorio && (
                  <span className="text-destructive ml-1" aria-hidden>
                    *
                  </span>
                )}
              </Label>
              {renderCampo(c)}
            </div>
          ))}

          {erro ? (
            <p role="alert" className="text-sm text-destructive">
              {erro}
            </p>
          ) : null}

          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Enviando…" : "Solicitar acesso"}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="justify-center text-sm text-muted-foreground">
        Já tem acesso?{" "}
        <Link href="/login" className="ml-1 underline">
          Entrar
        </Link>
      </CardFooter>
    </Card>
  );
}
