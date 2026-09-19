import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { AdminPanel, AdminShell } from "@/components/admin/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
        _count: { select: { usuarios: true } },
        recursos: { select: { recurso: { select: { chave: true } } } },
      },
    }),
    db.recurso.findMany({ orderBy: [{ grupo: "asc" }, { chave: "asc" }] }),
  ]);

  if (!papel) notFound();

  return (
    <AdminShell
      titulo={papel.nome}
      descricao="Altere nome, base e permissões. Os guardrails são validados no salvamento, e a mudança grava auditoria na mesma transação."
      acoes={
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard/papeis">
            <ArrowLeft aria-hidden />
            Voltar aos papéis
          </Link>
        </Button>
      }
    >
      <AdminPanel
        titulo="Editar papel"
        acoes={
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{papel.base}</Badge>
            <span className="text-xs text-muted-foreground tabular-nums">
              {papel.recursos.length} recursos · {papel._count.usuarios} usuários
            </span>
          </div>
        }
      >
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
      </AdminPanel>
    </AdminShell>
  );
}
