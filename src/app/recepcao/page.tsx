import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { requirePermissao } from "@/server/iam/session";
import {
  listarPacientesCer,
  buscarPacientePorDocumento,
} from "@/server/reception/paciente";
import { ListaPacientes } from "./lista-pacientes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Recepção — PTS Digital",
  description: "Lista de pacientes do CER e busca por CPF/CNS.",
};

export default async function RecepcaoPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requirePermissao("recepcao.paciente.ver");
  const { q } = await searchParams;

  // Se buscou por documento, verificar se já existe
  if (q && q.trim() !== "") {
    const paciente = await buscarPacientePorDocumento(q);
    if (paciente) redirect(`/pacientes/${paciente.id}`);
    redirect(`/recepcao/novo?q=${encodeURIComponent(q.trim())}`);
  }

  const pacientes = await listarPacientesCer();

  return (
    <main className="flex flex-col gap-6 p-8">
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Recepção
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            Pacientes do CER
          </h1>
        </div>
        <Link href="/recepcao/novo">
          <Button>Novo paciente</Button>
        </Link>
      </div>

      {/* Busca rápida */}
      <Card className="max-w-md">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Busca rápida</CardTitle>
          <CardDescription>
            Busque por CPF ou CNS. Não encontrou? Cadastre.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex gap-2" method="get">
            <div className="flex-1 space-y-1">
              <Label htmlFor="q" className="sr-only">CPF ou CNS</Label>
              <Input
                id="q"
                name="q"
                inputMode="numeric"
                placeholder="000.000.000-00"
              />
            </div>
            <Button type="submit" variant="outline">Buscar</Button>
          </form>
        </CardContent>
      </Card>

      {/* Lista de pacientes */}
      {pacientes.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhum paciente cadastrado neste CER ainda.
        </p>
      ) : (
        <ListaPacientes pacientes={pacientes} />
      )}
    </main>
  );
}
