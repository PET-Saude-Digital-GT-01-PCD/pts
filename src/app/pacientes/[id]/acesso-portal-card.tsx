"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Copy, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  emitirAcessoPortal,
  revogarAcessoPortal,
  type ResultadoAcesso,
} from "@/server/portal/acoes";
import type { AcessoPortalView } from "@/server/portal/listar";

type Emitido = Extract<ResultadoAcesso, { ok: true }>;

function situacao(a: AcessoPortalView): "ativo" | "expirado" | "revogado" {
  if (a.revogadoEm) return "revogado";
  if (a.validoAte.getTime() <= Date.now()) return "expirado";
  return "ativo";
}

const ROTULO_SITUACAO = {
  ativo: "Ativo",
  expirado: "Expirado",
  revogado: "Revogado",
};

const CLASSE_SITUACAO = {
  ativo: "text-success",
  expirado: "text-warning",
  revogado: "text-muted-foreground",
};

export function AcessoPortalCard({
  pacienteId,
  acessos,
}: {
  pacienteId: string;
  acessos: AcessoPortalView[];
}) {
  const router = useRouter();
  const [emitindo, startEmitir] = useTransition();
  const [revogandoId, setRevogandoId] = useState<string | null>(null);
  const [emitido, setEmitido] = useState<Emitido | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [copiado, setCopiado] = useState<"codigo" | "link" | null>(null);

  function emitir() {
    setErro(null);
    startEmitir(async () => {
      const res = await emitirAcessoPortal(pacienteId);
      if (res.ok) {
        setEmitido(res);
        setCopiado(null);
        router.refresh();
      } else {
        setErro(res.erro);
      }
    });
  }

  function revogar(acessoId: string) {
    setErro(null);
    setRevogandoId(acessoId);
    startEmitir(async () => {
      const res = await revogarAcessoPortal(acessoId);
      setRevogandoId(null);
      if (res.ok) {
        router.refresh();
      } else {
        setErro(res.erro);
      }
    });
  }

  async function copiar(valor: string, qual: "codigo" | "link") {
    try {
      await navigator.clipboard.writeText(valor);
      setCopiado(qual);
    } catch {
      setErro("Não foi possível copiar — selecione o texto manualmente.");
    }
  }

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-medium">Acesso ao portal do cidadão</h2>
      <p className="text-sm text-muted-foreground">
        Gere um código e entregue ao paciente (impresso ou QR). O link abre o
        portal direto; sem smartphone, o código pode ser digitado em{" "}
        <span className="font-mono">/portal</span>.
      </p>
      <p className="text-xs text-muted-foreground">
        O código aparece <strong>apenas uma vez</strong>: se perdê-lo, gere um
        novo. Cada nova emissão <strong>cancela automaticamente</strong> o
        código anterior.
      </p>

      {emitido ? (
        <div
          data-testid="acesso-emitido"
          className="space-y-2 rounded-lg border border-success/40 bg-success/10 p-4 text-sm"
        >
          <p className="font-medium">Código de acesso</p>
          <p
            data-testid="codigo-portal"
            className="font-mono text-2xl tracking-widest"
          >
            {emitido.codigo}
          </p>
          <p className="text-xs text-muted-foreground">
            Mostrado apenas uma vez. Válido até{" "}
            {emitido.validoAte.toLocaleDateString("pt-BR")}.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => copiar(emitido.codigo, "codigo")}
            >
              {copiado === "codigo" ? <Check /> : <Copy />}
              Copiar código
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => copiar(emitido.link, "link")}
            >
              {copiado === "link" ? <Check /> : <Copy />}
              Copiar link
            </Button>
          </div>
          <p className="break-all font-mono text-xs text-muted-foreground">
            {emitido.link}
          </p>
        </div>
      ) : null}

      <Button
        type="button"
        onClick={emitir}
        loading={emitindo && revogandoId === null}
        className="gap-2"
      >
        <KeyRound /> Emitir código de acesso
      </Button>

      {erro ? (
        <p role="alert" className="text-sm text-destructive">
          {erro}
        </p>
      ) : null}

      {acessos.length > 0 ? (
        <ul className="divide-y rounded-lg border text-sm">
          {acessos.map((a) => {
            const estado = situacao(a);
            return (
              <li key={a.id} className="flex items-center justify-between gap-2 p-3">
                <div className="space-y-0.5">
                  <p className={`font-medium ${CLASSE_SITUACAO[estado]}`}>
                    {ROTULO_SITUACAO[estado]}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Emitido em {a.emitidoEm.toLocaleDateString("pt-BR")} · válido
                    até {a.validoAte.toLocaleDateString("pt-BR")}
                    {a.usadoEm
                      ? ` · último acesso em ${a.usadoEm.toLocaleDateString("pt-BR")}`
                      : " · ainda não utilizado"}
                  </p>
                </div>
                {estado === "ativo" ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    loading={revogandoId === a.id}
                    onClick={() => revogar(a.id)}
                  >
                    Revogar
                  </Button>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">
          Nenhum acesso emitido ainda.
        </p>
      )}
    </section>
  );
}
