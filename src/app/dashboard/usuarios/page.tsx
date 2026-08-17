import Link from "next/link";

import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { requirePermissao } from "@/server/iam/session";
import { AtribuirPapelForm } from "./atribuir-papel-form";

export default async function UsuariosPage() {
  const user = await requirePermissao("admin.usuarios.ver");

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
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 p-8">
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
    </main>
  );
}