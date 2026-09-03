"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { aprovarUsuario, rejeitarUsuario } from "@/server/iam/admissao";
import type { UsuarioPendente } from "@/server/iam/admissao";

export function AprovacaoForm({ usuario }: { usuario: UsuarioPendente }) {
  const router = useRouter();
  const [mostrarRejeicao, setMostrarRejeicao] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function aprovar() {
    setErro(null);
    setPending(true);
    const resultado = await aprovarUsuario(usuario.id);
    setPending(false);
    if (!resultado.ok) {
      setErro(resultado.erro);
      return;
    }
    router.refresh();
  }

  async function rejeitar() {
    setErro(null);
    setPending(true);
    const resultado = await rejeitarUsuario(usuario.id, { motivo });
    setPending(false);
    if (!resultado.ok) {
      setErro(resultado.erro);
      return;
    }
    router.refresh();
  }

  const camposDinamicos =
    usuario.camposDinamicosJson && typeof usuario.camposDinamicosJson === "object"
      ? Object.entries(usuario.camposDinamicosJson as Record<string, unknown>)
      : [];

  return (
    <div
      data-testid="pendente-linha"
      data-email={usuario.email}
      className="flex flex-col gap-2 border-b px-4 py-3 last:border-b-0"
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-medium">{usuario.nome}</p>
          <p className="text-xs text-muted-foreground">
            {usuario.email} · {usuario.categoria} ·{" "}
            {usuario.criadoEm.toLocaleDateString("pt-BR")}
          </p>
          {camposDinamicos.length > 0 ? (
            <p className="mt-1 text-xs text-muted-foreground">
              {camposDinamicos
                .map(([campo, valor]) => `${campo}: ${String(valor)}`)
                .join(" · ")}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" size="sm" onClick={aprovar} disabled={pending}>
            Aprovar
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="text-destructive"
            onClick={() => setMostrarRejeicao((v) => !v)}
            disabled={pending}
          >
            Rejeitar
          </Button>
        </div>
      </div>
      {mostrarRejeicao ? (
        <div className="flex items-center gap-2">
          <input
            aria-label={`Motivo da rejeição de ${usuario.nome}`}
            className="border-input bg-background flex h-9 w-full rounded-md border px-3 text-sm"
            placeholder="Motivo (obrigatório)"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="text-destructive"
            onClick={rejeitar}
            disabled={pending || motivo.trim() === ""}
          >
            Confirmar rejeição
          </Button>
        </div>
      ) : null}
      {erro ? (
        <p role="alert" className="text-xs text-destructive">
          {erro}
        </p>
      ) : null}
    </div>
  );
}
