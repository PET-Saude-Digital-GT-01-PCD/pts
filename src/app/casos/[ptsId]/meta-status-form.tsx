"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { mudarStatusMeta } from "@/server/care-plan/metas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { campoNativoClasses, cn } from "@/lib/utils";

const ROTULOS: Record<string, string> = {
  NOVA: "Nova",
  EM_ANDAMENTO: "Em andamento",
  CONCLUIDA: "Concluída",
  NAO_ALCANCADA: "Não alcançada",
};

// Transições válidas (espelham TRANSICOES_STATUS em meta-schema.ts).
const PROXIMOS: Record<string, string[]> = {
  NOVA: ["EM_ANDAMENTO"],
  EM_ANDAMENTO: ["CONCLUIDA", "NAO_ALCANCADA"],
  CONCLUIDA: [],
  NAO_ALCANCADA: [],
};

export function MetaStatusForm({
  metaId,
  status,
  versao,
}: {
  metaId: string;
  status: string;
  versao: number;
}) {
  const destinos = PROXIMOS[status] ?? [];
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [statusAtual, setStatusAtual] = useState(status);
  const router = useRouter();

  if (destinos.length === 0) {
    return <span className="text-xs text-muted-foreground">{ROTULOS[statusAtual]} — final</span>;
  }

  function avancar(formData: FormData) {
    startTransition(async () => {
      const para = formData.get("para");
      const motivo = formData.get("motivo");
      const r = await mudarStatusMeta({
        metaId,
        para,
        motivo: typeof motivo === "string" && motivo.trim() ? motivo.trim() : undefined,
        version: versao,
      });
      if (r.ok) {
        setStatusAtual(String(para));
        setMensagem(null);
        router.refresh();
      } else {
        setMensagem(r.erro ?? "Erro ao mudar status.");
      }
    });
  }

  return (
    <form action={avancar} className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center" data-testid={`meta-status-${metaId}`}>
      <select
        name="para"
        className={cn(campoNativoClasses, "w-full sm:w-auto")}
        defaultValue={destinos[0]}
        aria-label="Novo status"
      >
        {destinos.map((d) => (
          <option key={d} value={d}>
            {ROTULOS[d]}
          </option>
        ))}
      </select>
      <Input
        name="motivo"
        placeholder="Motivo (opcional)"
        className="w-full sm:w-44"
        aria-label="Motivo da mudança de status"
      />
      <Button type="submit" variant="outline" size="sm" loading={pending}>
        Mudar status
      </Button>
      {mensagem && (
        <span role="alert" className="text-sm font-medium text-destructive">
          {mensagem}
        </span>
      )}
    </form>
  );
}
