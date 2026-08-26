"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { criarMeta } from "@/server/care-plan/metas";

const CAMPOS_SMART = [
  ["especifico", "Específico"],
  ["mensuravel", "Mensurável"],
  ["alcancavel", "Alcançável"],
  ["relevante", "Relevante"],
  ["temporal", "Temporal"],
] as const;

export function MetaForm({
  ptsId,
  donoId,
}: {
  ptsId: string;
  donoId: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function salvar(formData: FormData) {
    startTransition(async () => {
      const criteriosJson: Record<string, string> = {};
      for (const [chave] of CAMPOS_SMART) {
        const valor = formData.get(`smart-${chave}`);
        if (typeof valor === "string" && valor.trim() !== "") {
          criteriosJson[chave] = valor.trim();
        }
      }
      const prazoBruto = formData.get("prazo");
      const r = await criarMeta({
        ptsId,
        donoId,
        descTecnica: formData.get("descTecnica"),
        descAcessivel: formData.get("descAcessivel"),
        criteriosJson,
        prazo: typeof prazoBruto === "string" ? prazoBruto : undefined,
      });
      if (r.ok) {
        setMensagem("Meta criada.");
        setAberto(false);
        router.refresh();
      } else {
        setMensagem(r.erro ?? "Erro ao criar meta.");
      }
    });
  }

  if (!aberto) {
    return (
      <div className="space-y-1">
        <button
          type="button"
          onClick={() => setAberto(true)}
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
        >
          Nova meta
        </button>
        {mensagem && <p className="text-sm text-muted-foreground">{mensagem}</p>}
      </div>
    );
  }

  return (
    <form
      action={salvar}
      className="space-y-3 rounded-lg border p-4"
      data-testid="form-nova-meta"
    >
      <div className="grid gap-2">
        <label className="text-sm font-medium">
          Descrição técnica
          <textarea name="descTecnica" required className="mt-1 w-full rounded-md border p-2 text-sm" rows={2} />
        </label>
        <label className="text-sm font-medium">
          Descrição acessível (para o paciente)
          <textarea name="descAcessivel" required className="mt-1 w-full rounded-md border p-2 text-sm" rows={2} />
        </label>
      </div>
      <fieldset className="grid gap-2 sm:grid-cols-2">
        <legend className="mb-1 text-sm font-medium">Critérios SMART</legend>
        {CAMPOS_SMART.map(([chave, titulo]) => (
          <label key={chave} className="text-xs text-muted-foreground">
            {titulo}
            <input name={`smart-${chave}`} className="mt-0.5 w-full rounded-md border p-1.5 text-sm" />
          </label>
        ))}
      </fieldset>
      <label className="block text-sm font-medium">
        Prazo
        <input type="date" name="prazo" required className="ml-2 rounded-md border p-1.5 text-sm" />
      </label>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {pending ? "Salvando…" : "Salvar meta"}
        </button>
        <button
          type="button"
          onClick={() => setAberto(false)}
          className="text-sm text-muted-foreground"
        >
          Cancelar
        </button>
        {mensagem && <span className="text-sm text-destructive">{mensagem}</span>}
      </div>
    </form>
  );
}
