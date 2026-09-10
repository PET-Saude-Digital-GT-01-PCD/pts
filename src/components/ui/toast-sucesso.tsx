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
    <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 shadow-lg dark:border-emerald-700 dark:bg-emerald-950/90">
        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
        <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
          {mensagem}
        </p>
        <button
          type="button"
          onClick={() => {
            setVisivel(false);
            onFechar();
          }}
          className="ml-2 rounded-md p-0.5 text-emerald-600 hover:bg-emerald-100 dark:text-emerald-400 dark:hover:bg-emerald-900"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
