"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { StatusPts, TipoEncerramento } from "@prisma/client";

import { transicionarStatusPts } from "@/server/care-plan/pts";
import { transicoesValidas } from "@/server/care-plan/maquina-status";
import { emitirContrarreferencia } from "@/server/triage/contrarreferencia";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ROTULOS_STATUS: Record<StatusPts, string> = {
  EM_AVALIACAO: "Em avaliação",
  PACTACAO: "Pactuação",
  SEGUIMENTO: "Seguimento",
  REAVALIACAO: "Reavaliação",
  FECHADO: "Fechado",
};

const ROTULOS_TIPO_ENCERRAMENTO: Record<TipoEncerramento, string> = {
  ALTA: "Alta",
  CONTRARREFERENCIA: "Contrarreferência",
  DESCONTINUACAO: "Descontinuação",
};

export function TransicaoStatusForm({
  ptsId,
  status,
  versao,
  podeRevisar,
  podeEncerrar,
}: {
  ptsId: string;
  status: StatusPts;
  versao: number;
  podeRevisar: boolean;
  podeEncerrar: boolean;
}) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [aberto, setAberto] = useState<"avancar" | "encerrar" | null>(null);
  const [tipoEncerramento, setTipoEncerramento] =
    useState<TipoEncerramento>("ALTA");
  const [guiaEmitida, setGuiaEmitida] = useState<string | null>(null);

  const todosDestinos = transicoesValidas(status);
  const destinosAvancar = podeRevisar
    ? todosDestinos.filter((d) => d !== "FECHADO")
    : [];
  const podeEncerrarAgora = podeEncerrar && todosDestinos.includes("FECHADO");

  // guiaEmitida: mesmo se o PTS acabou de ser encerrado (e portanto não há
  // mais nenhuma transição/encerramento possível daqui), a confirmação da
  // guia continua visível em vez do componente desmontar sozinho.
  if (destinosAvancar.length === 0 && !podeEncerrarAgora && !guiaEmitida) {
    return null;
  }

  async function enviarAvanco(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro(null);
    setPending(true);
    const form = new FormData(event.currentTarget);
    const motivo = form.get("motivo");
    const r = await transicionarStatusPts({
      ptsId,
      para: form.get("para"),
      motivo: typeof motivo === "string" && motivo.trim() ? motivo.trim() : undefined,
      version: versao,
    });
    setPending(false);
    if (!r.ok) {
      setErro(r.erro);
      return;
    }
    setAberto(null);
    router.refresh();
  }

  async function enviarEncerramento(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro(null);
    setPending(true);
    const form = new FormData(event.currentTarget);
    const motivo = form.get("motivo");
    const r = await transicionarStatusPts({
      ptsId,
      para: "FECHADO",
      motivo,
      tipoEncerramento: form.get("tipoEncerramento"),
      version: versao,
    });
    if (!r.ok) {
      setPending(false);
      setErro(r.erro);
      return;
    }

    // Encerramento por contrarreferência também emite a guia (texto
    // pré-preenchido a partir do motivo, revisável antes de encerrar).
    if (tipoEncerramento === "CONTRARREFERENCIA") {
      const destinoUbs = form.get("destinoUbs");
      const planoCuidados = form.get("planoCuidados");
      const guia = await emitirContrarreferencia({
        ptsId,
        motivo,
        destinoUbs:
          typeof destinoUbs === "string" && destinoUbs.trim()
            ? destinoUbs.trim()
            : undefined,
        planoCuidados:
          typeof planoCuidados === "string" && planoCuidados.trim()
            ? planoCuidados.trim()
            : undefined,
      });
      if (guia.ok) setGuiaEmitida(guia.contrarreferenciaId);
    }

    setPending(false);
    setAberto(null);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2" data-testid="transicao-status-pts">
      <div className="flex flex-wrap gap-2">
        {destinosAvancar.length > 0 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setAberto(aberto === "avancar" ? null : "avancar")}
          >
            Avançar status
          </Button>
        )}
        {podeEncerrarAgora && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setAberto(aberto === "encerrar" ? null : "encerrar")}
          >
            Encerrar PTS
          </Button>
        )}
      </div>

      {aberto === "avancar" && (
        <form
          onSubmit={enviarAvanco}
          className="flex flex-wrap items-center gap-2 rounded-md border p-3"
          data-testid="form-avancar-status"
        >
          <select
            name="para"
            className="border-input bg-background rounded-md border px-2 py-1.5 text-sm"
            defaultValue={destinosAvancar[0]}
            aria-label="Novo status"
          >
            {destinosAvancar.map((d) => (
              <option key={d} value={d}>
                {ROTULOS_STATUS[d]}
              </option>
            ))}
          </select>
          <Input
            name="motivo"
            placeholder="Justificativa (opcional)"
            className="w-56"
            aria-label="Justificativa da transição"
          />
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "…" : "Confirmar"}
          </Button>
        </form>
      )}

      {aberto === "encerrar" && (
        <form
          onSubmit={enviarEncerramento}
          className="grid gap-3 rounded-md border p-3"
          data-testid="form-encerrar-pts"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="tipoEncerramento">Tipo de encerramento</Label>
              <select
                id="tipoEncerramento"
                name="tipoEncerramento"
                className="border-input bg-background flex h-9 w-full rounded-md border px-3 text-sm"
                value={tipoEncerramento}
                onChange={(e) =>
                  setTipoEncerramento(e.target.value as TipoEncerramento)
                }
              >
                {(Object.keys(ROTULOS_TIPO_ENCERRAMENTO) as TipoEncerramento[]).map(
                  (t) => (
                    <option key={t} value={t}>
                      {ROTULOS_TIPO_ENCERRAMENTO[t]}
                    </option>
                  ),
                )}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="motivo-encerramento">Motivo (obrigatório)</Label>
              <Input id="motivo-encerramento" name="motivo" required maxLength={500} />
            </div>
          </div>

          {tipoEncerramento === "CONTRARREFERENCIA" && (
            <div className="grid gap-4 rounded-md border border-dashed p-3 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="destinoUbs">UBS/APS de destino (opcional)</Label>
                <Input id="destinoUbs" name="destinoUbs" maxLength={120} />
              </div>
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="planoCuidados">
                  Plano de cuidados à APS (opcional — pré-preenchido a partir do
                  motivo, revise antes de encerrar)
                </Label>
                <textarea
                  id="planoCuidados"
                  name="planoCuidados"
                  rows={3}
                  maxLength={2000}
                  className="border-input bg-background rounded-md border px-3 py-2 text-sm"
                />
              </div>
            </div>
          )}

          <Button type="submit" disabled={pending}>
            {pending ? "Encerrando…" : "Confirmar encerramento"}
          </Button>
        </form>
      )}

      {guiaEmitida && (
        <p className="text-sm text-emerald-600" data-testid="guia-emitida-encerramento">
          Guia de contrarreferência emitida.{" "}
          <a
            href={`/contrarreferencia/${guiaEmitida}`}
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            Ver/imprimir
          </a>
        </p>
      )}

      {erro && (
        <p role="alert" className="text-sm text-destructive">
          {erro}
        </p>
      )}
    </div>
  );
}
