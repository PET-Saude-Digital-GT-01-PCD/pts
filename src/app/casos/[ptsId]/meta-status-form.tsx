"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { mudarStatusMeta } from "@/server/care-plan/metas";

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
    <form action={avancar} className="flex flex-wrap items-center gap-2" data-testid={`meta-status-${metaId}`}>
      <select
        name="para"
        className="rounded-md border p-1.5 text-sm"
        defaultValue={destinos[0]}
        aria-label="Novo status"
      >
        {destinos.map((d) => (
          <option key={d} value={d}>
            {ROTULOS[d]}
          </option>
        ))}
      </select>
      <input
        name="motivo"
        placeholder="Motivo (opcional)"
        className="w-44 rounded-md border p-1.5 text-sm"
        aria-label="Motivo da mudança de status"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md border px-2 py-1 text-sm font-medium disabled:opacity-50"
      >
        {pending ? "…" : "Mudar status"}
      </button>
      {mensagem && <span className="text-sm text-destructive">{mensagem}</span>}
    </form>
  );
}
