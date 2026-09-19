"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { encerrarImpersonacao } from "@/server/iam/impersonacao";

export function ImpersonacaoBanner() {
  const { data: session, update } = useSession();
  const router = useRouter();

  if (!session?.impersonando) return null;

  async function voltar() {
    await encerrarImpersonacao();
    await update({ pararImpersonacao: true });
    router.push("/dashboard/usuarios");
    router.refresh();
  }

  return (
    <div className="flex items-center justify-between border-b bg-amber-100 px-4 py-2 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">
      <span>
        Simulando perfil: <strong>{session.user.nome}</strong> ({session.user.nomePapel})
      </span>
      <Button type="button" variant="outline" size="sm" onClick={voltar}>
        Voltar ao meu perfil
      </Button>
    </div>
  );
}
