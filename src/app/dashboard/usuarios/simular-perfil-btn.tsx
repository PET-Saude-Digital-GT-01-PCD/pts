"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { iniciarImpersonacao } from "@/server/iam/impersonacao";

export function SimularPerfilBtn({
  usuarioId,
}: {
  usuarioId: string;
}) {
  const router = useRouter();
  const { update } = useSession();
  const [erro, setErro] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function simular() {
    setPending(true);
    setErro(null);
    const result = await iniciarImpersonacao(usuarioId);
    if (!result.ok) {
      setErro(result.erro);
      setPending(false);
      return;
    }
    await update({ impersonarId: usuarioId });
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={simular}
        disabled={pending}
      >
        Simular
      </Button>
      {erro ? <span className="text-xs text-destructive">{erro}</span> : null}
    </div>
  );
}
