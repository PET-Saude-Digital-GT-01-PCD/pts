import Link from "next/link";

import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { recursosDoUsuario, requirePermissao } from "@/server/iam/session";
import { AtribuirPapelForm } from "./atribuir-papel-form";

export default async function UsuariosPage() {
  const user = await requirePermissao("admin.usuarios.ver");
  const recursos = await recursosDoUsuario(user.papelId);
  const podeAtribuirPapel = recursos.includes("admin.papeis.gerenciar");

  const [usuarios, papeis] = await Promise.all([
    db.usuario.findMany({
      where: { cerId: user.cerId ?? undefined },
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
  ]);

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-8 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Usuários</h1>
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard/papeis">Papéis</Link>
        </Button>
      </div>

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
            {podeAtribuirPapel ? (
              <AtribuirPapelForm usuario={u} papeis={papeis} />
            ) : (
              <span className="text-sm text-muted-foreground">
                {papeis.find((p) => p.id === u.papelId)?.nome ?? "—"}
              </span>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}