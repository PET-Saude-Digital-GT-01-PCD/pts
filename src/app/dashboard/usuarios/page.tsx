import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { db } from "@/lib/db";
import { recursosDoUsuario, requirePermissao } from "@/server/iam/session";
import { listarPendentes } from "@/server/iam/admissao";
import { AtribuirPapelForm } from "./atribuir-papel-form";
import { AprovacaoForm } from "./aprovacao-form";

export default async function UsuariosPage() {
  const user = await requirePermissao("admin.usuarios.ver");
  const recursos = await recursosDoUsuario(user.papelId);
  const podeAtribuirPapel = recursos.includes("admin.papeis.gerenciar");
  const podeAprovar = recursos.includes("admin.usuarios.aprovar");

  const [usuarios, papeis, pendentes] = await Promise.all([
    db.usuario.findMany({
      where: { cerId: user.cerId ?? undefined, status: { not: "PENDENTE" } },
      orderBy: { nome: "asc" },
      select: {
        id: true,
        nome: true,
        email: true,
        status: true,
        papelId: true,
      },
    }),
    db.papel.findMany({
      where: { cerId: user.cerId ?? undefined, ativo: true },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true },
    }),
    podeAprovar ? listarPendentes() : Promise.resolve([]),
  ]);

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-8 p-4 sm:p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Usuários</h1>
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard/papeis">Papéis</Link>
        </Button>
      </div>

      {podeAprovar && pendentes.length > 0 ? (
        <section className="space-y-3" data-testid="fila-pendentes">
          <h2 className="text-lg font-medium">
            Pendentes de aprovação ({pendentes.length})
          </h2>
          <div className="divide-y rounded-md border">
            {pendentes.map((p) => (
              <AprovacaoForm key={p.id} usuario={p} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Usuários ativos</h2>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Papel</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usuarios.map((u) => (
                <TableRow key={u.id} data-email={u.email}>
                  <TableCell className="font-medium">{u.nome}</TableCell>
                  <TableCell className="text-muted-foreground">{u.email}</TableCell>
                  <TableCell className="text-muted-foreground">{u.status}</TableCell>
                  <TableCell className="whitespace-normal">
                    {podeAtribuirPapel ? (
                      <AtribuirPapelForm usuario={u} papeis={papeis} />
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        {papeis.find((p) => p.id === u.papelId)?.nome ?? "—"}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
    </main>
  );
}