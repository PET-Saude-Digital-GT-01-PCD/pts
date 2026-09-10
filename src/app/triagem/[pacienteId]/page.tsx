import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { requirePermissao } from "@/server/iam/session";
import { db } from "@/lib/db";
import { TriagemForm } from "@/app/casos/[ptsId]/triagem-form";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Triagem de Paciente — PTS Digital",
  description: "Formulário de triagem para paciente encaminhado.",
};

export default async function TriagemPacientePage({
  params,
}: {
  params: Promise<{ pacienteId: string }>;
}) {
  await requirePermissao("triage.triagem.escrever");
  const { pacienteId } = await params;

  const paciente = await db.paciente.findUnique({
    where: { id: pacienteId },
    select: {
      id: true,
      nome: true,
      cpf: true,
      cns: true,
      dtnasc: true,
      sexo: true,
      encaminhadoTriagem: true,
      baseline: {
        select: {
          diagnosticosJson: true,
          alergiasJson: true,
          medicacoesJson: true,
          internacoesJson: true,
          origemJson: true,
        },
      },
      pts: {
        where: { status: { not: "FECHADO" } },
        select: { id: true },
        take: 1,
      },
    },
  });

  if (!paciente) {
    return (
      <main className="flex items-center justify-center p-8">
        <p role="alert" className="text-destructive text-sm">
          Paciente não encontrado.
        </p>
      </main>
    );
  }

  if (paciente.pts.length > 0) {
    return (
      <main className="flex flex-col items-center gap-4 p-8">
        <p className="text-sm text-muted-foreground">
          Este paciente já possui um caso ativo.{" "}
          <a className="underline" href={`/casos/${paciente.pts[0].id}?aba=triagem`}>
            Abrir painel do caso
          </a>
        </p>
      </main>
    );
  }

  const diagnosticos = (paciente.baseline?.diagnosticosJson ?? []) as string[];
  const alergias = (paciente.baseline?.alergiasJson ?? []) as string[];
  const medicacoes = (paciente.baseline?.medicacoesJson ?? []) as Array<{
    nome: string;
    dosagem?: string | null;
  }>;
  const internacoes = (paciente.baseline?.internacoesJson ?? []) as string[];

  return (
    <main className="mx-auto max-w-3xl flex flex-col gap-6 p-8">
      <div className="flex items-center gap-3">
        <Link href="/triagem">
          <Button variant="ghost" size="sm" className="gap-1.5">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
        </Link>
      </div>

      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Triagem
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          {paciente.nome}
        </h1>
      </div>

      {/* Dados do paciente */}
      <dl className="divide-y rounded-md border text-sm">
        <div className="flex justify-between px-4 py-2">
          <dt className="text-muted-foreground">CPF</dt>
          <dd>{paciente.cpf ?? "—"}</dd>
        </div>
        <div className="flex justify-between px-4 py-2">
          <dt className="text-muted-foreground">CNS</dt>
          <dd>{paciente.cns ?? "—"}</dd>
        </div>
        <div className="flex justify-between px-4 py-2">
          <dt className="text-muted-foreground">Nascimento</dt>
          <dd>{paciente.dtnasc.toLocaleDateString("pt-BR")}</dd>
        </div>
        <div className="flex justify-between px-4 py-2">
          <dt className="text-muted-foreground">Sexo</dt>
          <dd>{paciente.sexo}</dd>
        </div>
      </dl>

      {/* Resumo da baseline */}
      {paciente.baseline && (
        <div className="rounded-md border p-4 space-y-2 text-sm">
          <h2 className="text-sm font-medium mb-2">Linha de base</h2>
          {diagnosticos.length > 0 && (
            <p><span className="font-medium">Diagnósticos:</span> {diagnosticos.join(", ")}</p>
          )}
          {alergias.length > 0 && (
            <p><span className="font-medium">Alergias:</span> {alergias.join(", ")}</p>
          )}
          {medicacoes.length > 0 && (
            <p><span className="font-medium">Medicações:</span> {medicacoes.map((m) => m.nome).join(", ")}</p>
          )}
          {internacoes.length > 0 && (
            <p><span className="font-medium">Internações:</span> {internacoes.join(", ")}</p>
          )}
        </div>
      )}

      {/* Formulário de triagem */}
      <TriagemForm pacienteId={paciente.id} />
    </main>
  );
}
