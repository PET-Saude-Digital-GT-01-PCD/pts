"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Semaforo } from "@prisma/client";

import { atualizarSemaforoReuniao } from "@/server/care-plan/atualizar-semaforo";
import type { EntradaReuniao } from "@/server/care-plan/semaforo-reuniao";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ROTULOS_SEMAFORO: Record<Semaforo, string> = {
  VERDE: "Verde",
  AMARELO: "Amarelo",
  VERMELHO: "Vermelho",
};

const CANAL_SUGERIDO: Record<Semaforo, string> = {
  VERDE: "Discussão digital (assíncrona)",
  AMARELO: "Discussão assíncrona estruturada",
  VERMELHO: "Reunião presencial",
};

export function SemaforoReuniaoForm({
  ptsId,
  versao,
  entrada,
  sugestao,
}: {
  ptsId: string;
  versao: number;
  entrada: EntradaReuniao;
  sugestao: Semaforo;
}) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [pending, setPending] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function confirmar(formData: FormData) {
    setPending(true);
    setErro(null);
    const motivo = formData.get("motivo");
    const r = await atualizarSemaforoReuniao(
      { ptsId, ...entrada, version: versao },
      typeof motivo === "string" && motivo.trim() ? motivo.trim() : undefined,
    );
    setPending(false);
    if (!r.ok) {
      setErro(r.erro);
      return;
    }
    setAberto(false);
    router.refresh();
  }

  const semSinais =
    !entrada.divergenciaEspecialidades &&
    entrada.conflitosMeta === 0 &&
    !entrada.eventoRisco &&
    !entrada.pendenciaAjuste;

  if (!aberto) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setAberto(true)}
        data-testid="abrir-classificar-reuniao"
      >
        Classificar reunião
      </Button>
    );
  }

  return (
    <form
      action={confirmar}
      className="grid gap-3 rounded-md border p-3"
      data-testid="form-semaforo-reuniao"
    >
      <div className="text-sm">
        <p>
          Classificação sugerida:{" "}
          <strong data-testid="sugestao-semaforo">
            {ROTULOS_SEMAFORO[sugestao]}
          </strong>
        </p>
        <p className="text-muted-foreground">
          Canal recomendado: {CANAL_SUGERIDO[sugestao]}
        </p>
        <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs text-muted-foreground">
          {entrada.divergenciaEspecialidades && (
            <li>Divergência relevante entre relato e avaliação clínica.</li>
          )}
          {entrada.conflitosMeta > 0 && (
            <li>
              {entrada.conflitosMeta}{" "}
              {entrada.conflitosMeta === 1 ? "conflito" : "conflitos"} de meta.
            </li>
          )}
          {entrada.eventoRisco && <li>Falta registrada nos últimos 30 dias.</li>}
          {entrada.pendenciaAjuste && (
            <li>Pendência do caso (meta vencida ou parado em avaliação).</li>
          )}
          {semSinais && <li>Nenhum sinal de atenção identificado.</li>}
        </ul>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="motivo-semaforo">Nota da reunião (opcional)</Label>
        <Input id="motivo-semaforo" name="motivo" maxLength={500} />
      </div>
      {erro && (
        <p role="alert" className="text-sm text-destructive">
          {erro}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Salvando…" : `Confirmar ${ROTULOS_SEMAFORO[sugestao]}`}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setAberto(false)}
          disabled={pending}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}
