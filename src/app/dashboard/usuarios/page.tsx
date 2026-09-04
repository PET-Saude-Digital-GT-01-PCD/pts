import Link from "next/link";

import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { recursosDoUsuario, requirePermissao } from "@/server/iam/session";
import { listarPendentes } from "@/server/iam/admissao";
import { AtribuirPapelForm } from "./atribuir-papel-form";
import { AprovarForm } from "./aprovar-form";

const STATUS_BADGE: Record<string, string> = {
  ATIVO: "bg-emerald-100/80 text-emerald-800 dark:bg-emerald-100/80 dark:text-emerald-800",
  PENDENTE: "bg-yellow-100/80 text-yellow-800 dark:bg-yellow-100/80 dark:text-yellow-800",
  BLOQUEADO: "bg-red-100/80 text-red-800 dark:bg-red-100/80 dark:text-red-800",
};

export default async function UsuariosPage() {
  const user = await requirePermissao("admin.usuarios.ver");
  const recursos = await recursosDoUsuario(user.papelId);
  const podeAtribuirPapel = recursos.includes("admin.papeis.gerenciar");
  const podeAprovar = recursos.includes("admin.usuarios.aprovar");

  const [pendentes, usuarios, papeis] = await Promise.all([
    db.usuario.findMany({
      where: { cerId: user.cerId ?? undefined, status: "PENDENTE" },
      orderBy: { criadoEm: "asc" },
      select: {
        id: true,
        nome: true,
        email: true,
        camposDinamicosJson: true,
      },
    }),
    db.usuario.findMany({
      where: {
        cerId: user.cerId ?? undefined,
        status: { not: "PENDENTE" },
      },
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

      {/* Fila de aprovação */}
      <section aria-labelledby="fila-pendentes-titulo">
        <div className="mb-3 flex items-center gap-2">
          <h2 id="fila-pendentes-titulo" className="text-lg font-semibold">
            Aguardando aprovação
          </h2>
          {pendentes.length > 0 && (
            <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
              {pendentes.length}
            </span>
          )}
        </div>

        {pendentes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum cadastro aguardando aprovação.
          </p>
        ) : (
          <div className="grid gap-3" data-testid="fila-pendentes">
            {pendentes.map((u) => (
              <AprovarForm key={u.id} usuario={u} />
            ))}
          </div>
        )}
      </section>

      {/* Lista de usuários ativos/bloqueados */}
      <section aria-labelledby="lista-usuarios-titulo">
        <h2 id="lista-usuarios-titulo" className="mb-3 text-lg font-semibold">
          Usuários
        </h2>
        <div className="divide-y rounded-md border">
          {usuarios.map((u) => (
            <div
              key={u.id}
              data-email={u.email}
              className="flex items-center justify-between gap-4 px-4 py-3"
            >
              <div>
                <p className="font-medium">{u.nome}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[u.status] ?? ""}`}
                  >
                    {u.status}
                  </span>
                </div>
              </div>
              <AtribuirPapelForm usuario={u} papeis={papeis} />
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}