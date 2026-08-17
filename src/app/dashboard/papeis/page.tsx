import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { db } from "@/lib/db";
import { requirePermissao } from "@/server/iam/session";
import { CriarPapelForm } from "./criar-papel-form";

export default async function PapeisPage() {
  const user = await requirePermissao("admin.papeis.gerenciar");

  const [papeis, recursos] = await Promise.all([
    db.papel.findMany({
      where: { cerId: user.cerId ?? undefined },
      orderBy: { nome: "asc" },
      include: {
        _count: { select: { usuarios: true } },
        recursos: { select: { recurso: { select: { chave: true } } } },
      },
    }),
    db.recurso.findMany({ orderBy: [{ grupo: "asc" }, { chave: "asc" }] }),
  ]);

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Papéis e permissões</h1>
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard/usuarios">Usuários</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Criar papel</CardTitle>
          <CardDescription>
            Base GESTOR não pode receber recursos clínicos; recursos de admin
            são restritos à base ADMIN.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CriarPapelForm
            recursos={recursos.map((r) => ({
              chave: r.chave,
              grupo: r.grupo,
              descricao: r.descricao,
            }))}
          />
        </CardContent>
      </Card>

      <div className="divide-y rounded-md border">
        {papeis.map((p) => (
          <Link
            key={p.id}
            href={`/dashboard/papeis/${p.id}`}
            className="flex items-center justify-between px-4 py-3 hover:bg-muted/50"
          >
            <div>
              <p className="font-medium">
                {p.nome}
                <span className="ml-2 text-xs text-muted-foreground">
                  {p.base}
                </span>
              </p>
              <p className="text-xs text-muted-foreground">
                {p.recursos.length} recursos · {p._count.usuarios} usuários
              </p>
            </div>
            {!p.ativo ? (
              <span className="text-xs text-muted-foreground">inativo</span>
            ) : null}
          </Link>
        ))}
      </div>
    </main>
  );
}