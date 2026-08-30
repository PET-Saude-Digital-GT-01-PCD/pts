"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { aprovarUsuario, rejeitarUsuario } from "@/server/iam/admissao";

export type UsuarioPendente = {
  id: string;
  nome: string;
  email: string;
  camposDinamicosJson: unknown;
};

export function AprovarForm({ usuario }: { usuario: UsuarioPendente }) {
  const router = useRouter();
  const [rejeitando, setRejeitando] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function aprovar() {
    setLoading(true);
    setErro(null);
    const result = await aprovarUsuario(usuario.id);
    if (!result.ok) {
      setErro(result.erro ?? "Erro ao aprovar.");
      setLoading(false);
      return;
    }
    router.refresh();
  }

  async function rejeitar() {
    if (motivo.trim().length < 10) {
      setErro("O motivo deve ter ao menos 10 caracteres.");
      return;
    }
    setLoading(true);
    setErro(null);
    const result = await rejeitarUsuario(usuario.id, motivo);
    if (!result.ok) {
      setErro(result.erro ?? "Erro ao rejeitar.");
      setLoading(false);
      return;
    }
    router.refresh();
  }

  const extras =
    usuario.camposDinamicosJson &&
    typeof usuario.camposDinamicosJson === "object" &&
    !Array.isArray(usuario.camposDinamicosJson)
      ? (usuario.camposDinamicosJson as Record<string, string>)
      : null;

  return (
    <div
      data-email={usuario.email}
      className="rounded-md border p-4 flex flex-col gap-3"
    >
      <div>
        <p className="font-medium">{usuario.nome}</p>
        <p className="text-xs text-muted-foreground">{usuario.email}</p>
        {extras && (
          <ul className="mt-1 text-xs text-muted-foreground space-y-0.5">
            {Object.entries(extras).map(([k, v]) => (
              <li key={k}>
                <span className="capitalize">{k.replace(/_/g, " ")}</span>: {v}
              </li>
            ))}
          </ul>
        )}
      </div>

      {!rejeitando ? (
        <div className="flex gap-2">
          <Button
            size="sm"
            disabled={loading}
            onClick={aprovar}
            data-action="aprovar"
          >
            Aprovar
          </Button>
          <Button
            size="sm"
            variant="destructive"
            disabled={loading}
            onClick={() => {
              setRejeitando(true);
              setErro(null);
            }}
          >
            Rejeitar
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium" htmlFor={`motivo-${usuario.id}`}>
            Motivo da rejeição{" "}
            <span className="text-destructive" aria-hidden>
              *
            </span>
          </label>
          <textarea
            id={`motivo-${usuario.id}`}
            className="rounded-md border bg-background px-3 py-2 text-sm resize-none h-20"
            placeholder="Descreva o motivo (mínimo 10 caracteres)…"
            value={motivo}
            onChange={(e) => {
              setMotivo(e.target.value);
              setErro(null);
            }}
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="destructive"
              disabled={loading || motivo.trim().length < 10}
              onClick={rejeitar}
              data-action="confirmar-rejeicao"
            >
              Confirmar rejeição
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={loading}
              onClick={() => {
                setRejeitando(false);
                setMotivo("");
                setErro(null);
              }}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {erro ? (
        <p role="alert" className="text-xs text-destructive">
          {erro}
        </p>
      ) : null}
    </div>
  );
}
