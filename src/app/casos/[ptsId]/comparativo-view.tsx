"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  buscarComparativo,
  type MarcoRevisao,
} from "@/server/care-plan/revisao";
import type { ComparativoRevisoes } from "@/server/care-plan/comparativo";

const ELEGIBILIDADE_STATUS: Record<string, string> = {
  NOVA: "Nova",
  EM_ANDAMENTO: "Em andamento",
  CONCLUIDA: "Concluída",
  NAO_ALCANCADA: "Não alcançada",
};

export function ComparativoView({
  ptsId,
  revisoes,
}: {
  ptsId: string;
  revisoes: MarcoRevisao[];
}) {
  const [deId, setDeId] = useState(revisoes[0]?.id ?? "");
  const [paraId, setParaId] = useState(revisoes.at(-1)?.id ?? "");
  const [comparativo, setComparativo] = useState<ComparativoRevisoes | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function comparar() {
    setErro(null);
    setComparativo(null);
    setCarregando(true);
    const resultado = await buscarComparativo(ptsId, deId, paraId);
    setCarregando(false);
    if (!resultado.ok) {
      setErro(resultado.erro);
      return;
    }
    setComparativo(resultado.comparativo);
  }

  if (revisoes.length < 2) {
    return (
      <p className="text-sm text-muted-foreground">
        É preciso ao menos duas revisões registradas para comparar.
      </p>
    );
  }

  return (
    <div className="grid gap-4 rounded-lg border p-4">
      <div className="grid gap-3 sm:grid-cols-3 sm:items-end">
        <div className="grid gap-1">
          <Label htmlFor="revisao-de">De</Label>
          <select
            id="revisao-de"
            value={deId}
            onChange={(e) => setDeId(e.target.value)}
            className="border-input bg-background flex h-9 w-full rounded-md border px-3 text-sm"
          >
            {revisoes.map((r) => (
              <option key={r.id} value={r.id}>
                Revisão #{r.numero}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1">
          <Label htmlFor="revisao-para">Até</Label>
          <select
            id="revisao-para"
            value={paraId}
            onChange={(e) => setParaId(e.target.value)}
            className="border-input bg-background flex h-9 w-full rounded-md border px-3 text-sm"
          >
            {revisoes.map((r) => (
              <option key={r.id} value={r.id}>
                Revisão #{r.numero}
              </option>
            ))}
          </select>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={comparar}
          disabled={carregando || deId === paraId}
        >
          {carregando ? "Comparando…" : "Comparar"}
        </Button>
      </div>

      {erro ? (
        <p role="alert" className="text-sm text-destructive">
          {erro}
        </p>
      ) : null}

      {comparativo ? (
        <div className="grid gap-4" data-testid="resultado-comparativo">
          <Secao titulo="Metas">
            {comparativo.metas.length === 0 ? (
              <SemMudanca />
            ) : (
              <ul className="space-y-1 text-sm">
                {comparativo.metas.map((m, i) => (
                  <li key={i}>
                    <span className="font-medium">{m.descTecnica}</span>:{" "}
                    {m.de ? ELEGIBILIDADE_STATUS[m.de] ?? m.de : "criada"} →{" "}
                    {ELEGIBILIDADE_STATUS[m.para] ?? m.para}
                    {m.motivo ? ` (${m.motivo})` : ""}
                  </li>
                ))}
              </ul>
            )}
          </Secao>

          <Secao titulo="Avaliações">
            {comparativo.avaliacoes.length === 0 ? (
              <SemMudanca />
            ) : (
              <ul className="space-y-1 text-sm">
                {comparativo.avaliacoes.map((a) => (
                  <li key={a.id}>
                    Avaliação {a.especialidade} em{" "}
                    {a.criadaEm.toLocaleDateString("pt-BR")}
                  </li>
                ))}
              </ul>
            )}
          </Secao>

          <Secao titulo="Classificação (triagem)">
            {comparativo.ajustesClassificacao.length === 0 ? (
              <SemMudanca />
            ) : (
              <ul className="space-y-1 text-sm">
                {comparativo.ajustesClassificacao.map((a) => (
                  <li key={a.id}>
                    {a.de} → {a.para} ({a.motivo})
                  </li>
                ))}
              </ul>
            )}
          </Secao>

          <Secao titulo="Semáforo de reunião">
            {comparativo.semaforoReuniao.length === 0 ? (
              <SemMudanca />
            ) : (
              <ul className="space-y-1 text-sm">
                {comparativo.semaforoReuniao.map((s, i) => (
                  <li key={i}>
                    {s.classificacao} em {s.data.toLocaleDateString("pt-BR")}
                  </li>
                ))}
              </ul>
            )}
          </Secao>
        </div>
      ) : null}
    </div>
  );
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-sm font-medium">{titulo}</h4>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function SemMudanca() {
  return <p className="text-xs text-muted-foreground">Sem mudanças no período.</p>;
}
