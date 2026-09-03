import Link from "next/link";

import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { recursosDoUsuario, requirePermissao } from "@/server/iam/session";
import { listarPendentes } from "@/server/iam/admissao";
import { AtribuirPapelForm } from "./atribuir-papel-form";
import { AprovacaoForm } from "./aprovacao-form";

export default async function UsuariosPage() {
  const user = await requirePermissao("admin.usuarios.ver");
  const recursos = await recursosDoUsuario(user.papelId);
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
    <main className="mx-auto flex max-w-3xl flex-col gap-8 p-8">
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
        <div className="divide-y rounded-md border">
          {usuarios.map((u) => (
            <div
              key={u.id}
              data-email={u.email}
              className="flex items-center justify-between gap-4 px-4 py-3"
            >
              <div>
                <p className="font-medium">{u.nome}</p>
                <p className="text-xs text-muted-foreground">
                  {u.email} · {u.status}
                </p>
              </div>
              <AtribuirPapelForm usuario={u} papeis={papeis} />
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}