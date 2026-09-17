"use client";

import { useState, useTransition, useCallback } from "react";
import { ArrowRight, Check } from "lucide-react";

import { encaminharParaTriagem } from "@/server/reception/paciente";
import { Button } from "@/components/ui/button";
import { ToastSucesso } from "@/components/ui/toast-sucesso";

export function EncaminharTriagemBtn({
  pacienteId,
  nome,
  jaEncaminhado,
}: {
  pacienteId: string;
  nome: string;
  jaEncaminhado: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [encaminhado, setEncaminhado] = useState(jaEncaminhado);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const fecharToast = useCallback(() => setToastMsg(null), []);

  function handleEncaminhar() {
    setErro(null);
    startTransition(async () => {
      const res = await encaminharParaTriagem(pacienteId);
      if (res.ok) {
        setEncaminhado(true);
        setToastMsg(`${nome} encaminhado(a) para triagem com sucesso!`);
      } else {
        setErro(res.erro);
      }
    });
  }

  return (
    <section className="space-y-2">
      {encaminhado ? (
        <p className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
          <Check className="h-4 w-4" />
          Encaminhado para triagem
        </p>
      ) : (
        <Button
          onClick={handleEncaminhar}
          disabled={pending}
          className="gap-2"
        >
          <ArrowRight className="h-4 w-4" />
          {pending ? "Encaminhando…" : "Encaminhar para triagem"}
        </Button>
      )}
      {erro && (
        <p role="alert" className="text-sm text-destructive">
          {erro}
        </p>
      )}
      <ToastSucesso
        mensagem={toastMsg ?? ""}
        aberto={!!toastMsg}
        onFechar={fecharToast}
      />
    </section>
  );
}
