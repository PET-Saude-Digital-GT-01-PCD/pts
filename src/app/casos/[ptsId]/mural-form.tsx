"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import { comentarMural } from "@/server/care-plan/mural";

export function MuralForm({ ptsId }: { ptsId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function enviar(formData: FormData) {
    startTransition(async () => {
      const r = await comentarMural({
        ptsId,
        texto: formData.get("texto"),
      });
      if (r.ok) {
        formRef.current?.reset();
        setMensagem(null);
        router.refresh();
      } else {
        setMensagem(r.erro ?? "Erro ao comentar.");
      }
    });
  }

  return (
    <form ref={formRef} action={enviar} className="space-y-2" data-testid="form-mural">
      <textarea
        name="texto"
        rows={3}
        required
        maxLength={4000}
        placeholder="Comente no mural do caso (visível para a equipe)…"
        className="w-full rounded-md border p-2 text-sm"
      />
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {pending ? "Enviando…" : "Comentar"}
        </button>
        {mensagem && <span className="text-sm text-destructive">{mensagem}</span>}
      </div>
    </form>
  );
}
