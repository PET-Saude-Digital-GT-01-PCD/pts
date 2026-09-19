"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  const [erro, setErro] = useState<string | null>(null);
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
        setErro(null);
        setMensagem("Meta criada.");
        setAberto(false);
        router.refresh();
      } else {
        setErro(r.erro ?? "Erro ao criar meta.");
      }
    });
  }

  if (!aberto) {
    return (
      <div className="space-y-1">
        <Button
          type="button"
          onClick={() => {
            setMensagem(null);
            setAberto(true);
          }}
          className="w-full sm:w-auto"
        >
          Nova meta
        </Button>
        {mensagem && (
          <p role="status" className="text-sm text-muted-foreground">
            {mensagem}
          </p>
        )}
      </div>
    );
  }

  return (
    <form
      action={salvar}
      className="space-y-4 rounded-lg border border-border p-4"
      data-testid="form-nova-meta"
    >
      <div className="grid gap-4">
        <FormField id="meta-desc-tecnica" label="Descrição técnica" obrigatorio>
          {(aria) => <Textarea {...aria} name="descTecnica" rows={2} required />}
        </FormField>
        <FormField
          id="meta-desc-acessivel"
          label="Descrição acessível"
          dica="Linguagem simples, para o paciente e a família."
          obrigatorio
        >
          {(aria) => <Textarea {...aria} name="descAcessivel" rows={2} required />}
        </FormField>
      </div>
      <fieldset className="grid gap-3 sm:grid-cols-2">
        <legend className="mb-2 text-sm font-medium">Critérios SMART</legend>
        {CAMPOS_SMART.map(([chave, titulo]) => (
          <div key={chave} className="flex flex-col gap-1.5">
            <Label htmlFor={`smart-${chave}`}>{titulo}</Label>
            <Input id={`smart-${chave}`} name={`smart-${chave}`} />
          </div>
        ))}
      </fieldset>
      <FormField id="meta-prazo" label="Prazo" obrigatorio className="sm:max-w-48">
        {(aria) => <Input {...aria} type="date" name="prazo" required />}
      </FormField>
      {erro && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {erro}
        </p>
      )}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
        <Button type="submit" loading={pending}>
          {pending ? "Salvando…" : "Salvar meta"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => setAberto(false)}
          disabled={pending}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}
