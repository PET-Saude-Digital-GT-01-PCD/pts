"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, X } from "lucide-react";

/**
 * Toast de sucesso que aparece por alguns segundos e desaparece.
 * Usa animação CSS pura (slide-in + fade-out).
 */
export function ToastSucesso({
  mensagem,
  aberto,
  onFechar,
  duracao = 3000,
}: {
  mensagem: string;
  aberto: boolean;
  onFechar: () => void;
  duracao?: number;
}) {
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    if (!aberto) {
      setVisivel(false);
      return;
    }
    setVisivel(true);
    const timer = setTimeout(() => {
      setVisivel(false);
      onFechar();
    }, duracao);
    return () => clearTimeout(timer);
  }, [aberto, duracao, onFechar]);

  if (!visivel) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-4 bottom-4 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300 motion-reduce:animate-none sm:inset-x-auto sm:right-6 sm:bottom-6"
    >
      <div className="flex items-center gap-3 rounded-lg border border-success/40 bg-success/10 px-4 py-3 shadow-lg backdrop-blur-sm">
        <CheckCircle2 className="size-5 shrink-0 text-success" aria-hidden />
        <p className="text-sm font-medium text-success">
          {mensagem}
        </p>
        <button
          type="button"
          onClick={() => {
            setVisivel(false);
            onFechar();
          }}
          aria-label="Fechar aviso"
          className="ml-auto rounded-md p-1 text-success transition-colors outline-none hover:bg-success/15 focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
