import type { Metadata } from "next";
import Link from "next/link";
import { Stethoscope, User } from "lucide-react";

import { requirePermissao } from "@/server/iam/session";
import { pacientesEncaminhadosTriagem } from "@/server/reception/paciente";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Fila de Triagem — PTS Digital",
  description: "Pacientes encaminhados para triagem.",
};

export default async function TriagemPage() {
  await requirePermissao("triage.triagem.escrever");
  const pacientes = await pacientesEncaminhadosTriagem();

  return (
    <main className="flex flex-col gap-6 p-8">
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Triagem
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          Fila de Triagem
        </h1>
        <p className="text-sm text-muted-foreground">
          Pacientes encaminhados pela recepção aguardando classificação.
        </p>
      </div>

      {pacientes.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center text-muted-foreground">
          <User className="mb-3 h-10 w-10 opacity-40" />
          <p className="text-sm">
            Nenhum paciente na fila de triagem no momento.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pacientes.map((p) => {
            const diagnosticos = (p.baseline?.diagnosticosJson ?? []) as string[];

            return (
              <Link key={p.id} href={`/triagem/${p.id}`}>
                <Card className="cursor-pointer transition-shadow hover:shadow-md hover:border-primary/40">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base">{p.nome}</CardTitle>
                      <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 text-xs shrink-0">
                        Aguardando
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {p.cpf ? `CPF: ${p.cpf}` : ""}
                      {p.cpf && p.cns ? " · " : ""}
                      {p.cns ? `CNS: ${p.cns}` : ""}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span>
                        Nasc.: {p.dtnasc.toLocaleDateString("pt-BR")}
                      </span>
                      <span>Sexo: {p.sexo}</span>
                    </div>
                    {diagnosticos.length > 0 && (
                      <div className="flex items-start gap-1.5 text-xs">
                        <Stethoscope className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          {diagnosticos.slice(0, 3).join(", ")}
                          {diagnosticos.length > 3 && ` +${diagnosticos.length - 3}`}
                        </span>
                      </div>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2 w-full text-xs"
                    >
                      Realizar triagem
                    </Button>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
