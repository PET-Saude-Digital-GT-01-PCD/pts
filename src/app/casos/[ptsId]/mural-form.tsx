"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Textarea } from "@/components/ui/textarea";
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
    <form ref={formRef} action={enviar} className="space-y-3" data-testid="form-mural">
      <FormField
        id="mural-texto"
        label="Comentário no mural"
        dica="Visível para toda a equipe do caso."
        erro={mensagem}
        obrigatorio
      >
        {(aria) => (
          <Textarea
            {...aria}
            name="texto"
            rows={3}
            required
            maxLength={4000}
            placeholder="Comente no mural do caso…"
          />
        )}
      </FormField>
      <Button type="submit" loading={pending} className="w-full sm:w-auto">
        {pending ? "Enviando…" : "Comentar"}
      </Button>
    </form>
  );
}
