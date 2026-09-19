"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { atribuirPapelUsuario } from "@/server/iam/papeis";
import { campoNativoClasses, cn } from "@/lib/utils";

export type UsuarioLinha = {
  id: string;
  nome: string;
  email: string;
  status: string;
  papelId: string;
};

export function AtribuirPapelForm({
  usuario,
  papeis,
}: {
  usuario: UsuarioLinha;
  papeis: { id: string; nome: string }[];
}) {
  const router = useRouter();
  const [papelId, setPapelId] = useState(usuario.papelId);
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function salvar() {
    if (papelId === usuario.papelId) return;
    setErro(null);
    setOk(false);
    const result = await atribuirPapelUsuario(usuario.id, papelId);
    if (!result.ok) {
      setErro(result.erro ?? "Erro ao atribuir papel.");
      return;
    }
    setOk(true);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <select
        aria-label={`Papel de ${usuario.nome}`}
        className={cn(campoNativoClasses, "w-auto min-w-44")}
        value={papelId}
        onChange={(e) => {
          setPapelId(e.target.value);
          setOk(false);
          setErro(null);
        }}
      >
        {papeis.map((p) => (
          <option key={p.id} value={p.id}>
            {p.nome}
          </option>
        ))}
      </select>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={salvar}
        disabled={papelId === usuario.papelId}
      >
        Salvar
      </Button>
      {erro ? <span className="text-xs text-destructive">{erro}</span> : null}
      {ok ? (
        <span className="text-xs font-medium text-success">salvo</span>
      ) : null}
    </div>
  );
}