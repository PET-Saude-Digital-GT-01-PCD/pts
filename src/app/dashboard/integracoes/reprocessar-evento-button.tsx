"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { reprocessarEventoOutbound } from "@/server/integrations/outbound/actions";

export function ReprocessarEventoButton({ eventoId }: { eventoId: string }) {
  const router = useRouter();
  const [pendente, setPendente] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function reprocessar() {
    setErro(null);
    setPendente(true);
    try {
      const resultado = await reprocessarEventoOutbound(eventoId);
      if (!resultado.ok) {
        setErro(resultado.erro);
        return;
      }
      router.refresh();
    } finally {
      setPendente(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <Button type="button" size="sm" variant="outline" onClick={reprocessar} disabled={pendente}>
        {pendente ? "Reenfileirando…" : "Reprocessar"}
      </Button>
      {erro ? <span className="text-xs text-destructive" role="alert">{erro}</span> : null}
    </div>
  );
}
