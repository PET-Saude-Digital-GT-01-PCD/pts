"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  buscarIndicadores,
  exportarCsv,
  type PainelIndicadores,
} from "@/server/governance/relatorios";
import { classificarIndicador } from "@/server/governance/indicadores";

const STATUS_LABEL: Record<string, string> = {
  OK: "OK",
  ATENCAO: "Atenção",
  SEM_DADO: "Sem dado",
};

const STATUS_CLASSE: Record<string, string> = {
  OK: "border-emerald-500/40 bg-emerald-500/10 text-emerald-600",
  ATENCAO: "border-destructive/40 bg-destructive/10 text-destructive",
  SEM_DADO: "border-border bg-muted text-muted-foreground",
};

function paraInputDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function GovernancaViewer({
  painelInicial,
}: {
  painelInicial: PainelIndicadores;
}) {
  const [painel, setPainel] = useState(painelInicial);
  const [desde, setDesde] = useState(paraInputDate(painelInicial.periodo.desde));
  const [ate, setAte] = useState(paraInputDate(painelInicial.periodo.ate));
  const [carregando, setCarregando] = useState(false);

  async function aplicarFiltro(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCarregando(true);
    const novoPainel = await buscarIndicadores({
      desde: new Date(desde),
      ate: new Date(`${ate}T23:59:59`),
    });
    setPainel(novoPainel);
    setCarregando(false);
  }

  async function exportar() {
    const csv = await exportarCsv({
      desde: new Date(desde),
      ate: new Date(`${ate}T23:59:59`),
    });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `indicadores-governanca-${desde}-a-${ate}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-6">
      <form
        className="flex flex-wrap items-end gap-3 rounded-lg border p-4"
        onSubmit={aplicarFiltro}
      >
        <div className="grid gap-1">
          <Label htmlFor="desde">Desde</Label>
          <Input
            id="desde"
            type="date"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
          />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="ate">Até</Label>
          <Input id="ate" type="date" value={ate} onChange={(e) => setAte(e.target.value)} />
        </div>
        <Button type="submit" variant="outline" disabled={carregando}>
          {carregando ? "Atualizando…" : "Aplicar período"}
        </Button>
        <Button type="button" onClick={exportar} disabled={carregando}>
          Exportar CSV
        </Button>
      </form>

      <div className="grid gap-4 sm:grid-cols-2" data-testid="lista-indicadores">
        {painel.indicadores.map((ind) => {
          const status = ind.disponivel
            ? classificarIndicador(ind.valor, ind.meta, ind.maiorEhMelhor)
            : "SEM_DADO";
          return (
            <div
              key={ind.id}
              data-testid={`indicador-${ind.id}`}
              className="rounded-lg border p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-medium">{ind.titulo}</h3>
                <span
                  className={`rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_CLASSE[status]}`}
                >
                  {STATUS_LABEL[status]}
                </span>
              </div>
              <p className="mt-2 text-2xl font-semibold">
                {ind.valor === null
                  ? "—"
                  : ind.unidade === "%"
                    ? `${ind.valor}%`
                    : `${ind.valor} ${ind.unidade}`}
              </p>
              <p className="text-xs text-muted-foreground">
                Meta: {ind.maiorEhMelhor ? "≥" : "≤"}
                {ind.meta}
                {ind.unidade === "%" ? "%" : ` ${ind.unidade}`}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Fonte: {ind.fonte}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
