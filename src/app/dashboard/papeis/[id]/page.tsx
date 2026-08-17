import { notFound } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { db } from "@/lib/db";
import { requirePermissao } from "@/server/iam/session";
import { EditarPapelForm } from "./editar-papel-form";

export default async function EditarPapelPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermissao("admin.papeis.gerenciar");
  const { id } = await params;

  const [papel, recursos] = await Promise.all([
    db.papel.findUnique({
      where: { id },
      include: {
        recursos: { select: { recurso: { select: { chave: true } } } },
      },
    }),
    db.recurso.findMany({ orderBy: { grupo: "asc", chave: "asc" } }),
  ]);

  if (!papel) notFound();

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 p-8">
      <h1 className="text-2xl font-semibold">Editar papel</h1>
      <Card>
        <CardHeader>
          <CardTitle>{papel.nome}</CardTitle>
          <CardDescription>
            Altere nome, base e permissões. Guardrails são validados no
            salvamento.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EditarPapelForm
            papelId={papel.id}
            nome={papel.nome}
            descricao={papel.descricao}
            base={papel.base}
            recursos={papel.recursos.map((pr) => pr.recurso.chave)}
            todas={recursos.map((r) => ({
              chave: r.chave,
              grupo: r.grupo,
              descricao: r.descricao,
            }))}
          />
        </CardContent>
      </Card>
    </main>
  );
}