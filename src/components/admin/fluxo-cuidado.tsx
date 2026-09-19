"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { EtapaFluxoId, EtapaFluxoView } from "@/server/care-plan/fluxo";

type Tom = "entrada" | "nucleo" | "saida";

const TOM_POR_ETAPA: Record<EtapaFluxoId, Tom> = {
  RECEPCAO: "entrada",
  TRIAGEM: "entrada",
  EM_AVALIACAO: "nucleo",
  PACTACAO: "nucleo",
  SEGUIMENTO: "nucleo",
  REAVALIACAO: "nucleo",
  FECHADO: "saida",
};

const BARRA: Record<Tom, string> = {
  entrada: "bg-brand-light",
  nucleo: "bg-primary",
  saida: "bg-success",
};

const PONTO: Record<Tom, string> = {
  entrada: "bg-brand-light/15 text-brand-light",
  nucleo: "bg-primary/10 text-primary",
  saida: "bg-success/15 text-success",
};

const CATEGORIA_LABEL: Record<string, string> = {
  RECEPCAO: "Recepção",
  TRIADOR: "Triador",
  MEDICO: "Médico",
  FISIOTERAPEUTA: "Fisioterapeuta",
  TERAPEUTA_OCUPACIONAL: "Terapeuta ocupacional",
  PSICOLOGO: "Psicólogo",
  ENFERMEIRO: "Enfermeiro",
  GESTOR: "Gestor",
};

/**
 * Trilha interativa do cuidado: cada etapa é uma aba que abre o detalhe
 * (o que acontece, quem atua, quais permissões e para onde o caso segue).
 * Teclado: setas navegam, Home/End vão às pontas — padrão WAI-ARIA de tabs.
 */
export function FluxoCuidado({ etapas }: { etapas: EtapaFluxoView[] }) {
  const [ativa, setAtiva] = useState(0);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function mover(indice: number) {
    const proximo = (indice + etapas.length) % etapas.length;
    setAtiva(proximo);
    refs.current[proximo]?.focus();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLButtonElement>, i: number) {
    const teclas: Record<string, () => void> = {
      ArrowRight: () => mover(i + 1),
      ArrowDown: () => mover(i + 1),
      ArrowLeft: () => mover(i - 1),
      ArrowUp: () => mover(i - 1),
      Home: () => mover(0),
      End: () => mover(etapas.length - 1),
    };
    const acao = teclas[e.key];
    if (!acao) return;
    e.preventDefault();
    acao();
  }

  const etapa = etapas[ativa];
  const tom = TOM_POR_ETAPA[etapa.id];

  return (
    <div className="flex flex-col gap-4">
      <div
        role="tablist"
        aria-label="Etapas do fluxo do cuidado"
        className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:flex xl:items-stretch xl:gap-1"
      >
        {etapas.map((e, i) => {
          const selecionada = i === ativa;
          const tomEtapa = TOM_POR_ETAPA[e.id];
          return (
            <div key={e.id} className="flex min-w-0 flex-1 items-center gap-1">
              <button
                type="button"
                role="tab"
                id={`etapa-${e.id}`}
                ref={(el) => {
                  refs.current[i] = el;
                }}
                aria-selected={selecionada}
                aria-controls="detalhe-etapa"
                tabIndex={selecionada ? 0 : -1}
                onClick={() => setAtiva(i)}
                onKeyDown={(ev) => onKeyDown(ev, i)}
                className={cn(
                  "group flex min-w-0 flex-1 flex-col gap-2 rounded-2xl p-3 text-left transition-all outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                  selecionada
                    ? "bg-primary/5 shadow-soft ring-2 ring-primary/40"
                    : "bg-surface-raised/60 ring-1 ring-foreground/5 hover:bg-surface-raised hover:shadow-soft",
                )}
              >
                <span className="flex items-center gap-2">
                  <span
                    className={cn(
                      "flex size-5 shrink-0 items-center justify-center rounded-full text-[0.6875rem] font-semibold",
                      PONTO[tomEtapa],
                    )}
                    aria-hidden
                  >
                    {i + 1}
                  </span>
                  <span className="text-sm leading-tight font-medium">{e.titulo}</span>
                </span>
                <span className="mt-auto flex items-baseline gap-1.5">
                  <span className="text-2xl leading-none font-semibold tabular-nums">
                    {e.total}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {e.rotuloCurto}
                  </span>
                </span>
                <span
                  className="h-1.5 w-full overflow-hidden rounded-full bg-surface-sunken"
                  aria-hidden
                >
                  <span
                    className={cn(
                      "block h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none",
                      BARRA[tomEtapa],
                    )}
                    style={{ width: `${Math.max(e.proporcao * 100, e.total > 0 ? 8 : 0)}%` }}
                  />
                </span>
              </button>
              {i < etapas.length - 1 ? (
                <ChevronRight
                  className="hidden size-4 shrink-0 text-muted-foreground xl:block"
                  aria-hidden
                />
              ) : null}
            </div>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id="detalhe-etapa"
        aria-labelledby={`etapa-${etapa.id}`}
        tabIndex={0}
        className="flex flex-col gap-5 rounded-3xl bg-surface-raised p-5 shadow-soft ring-1 ring-foreground/5 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:p-6"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <p
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
                PONTO[tom],
              )}
            >
              Etapa {ativa + 1} de {etapas.length}
            </p>
            <h3 className="text-lg font-semibold">{etapa.titulo}</h3>
            <p className="max-w-prose text-sm text-muted-foreground">
              {etapa.resumo}
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-semibold tabular-nums">{etapa.total}</p>
            <p className="text-xs text-muted-foreground">{etapa.rotuloMetrica}</p>
          </div>
        </div>

        <p className="max-w-prose text-sm">{etapa.detalhe}</p>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Quem atua
            </p>
            <div className="flex flex-wrap gap-1.5">
              {etapa.quemAtua.map((papel) => (
                <Badge key={papel} variant="secondary">
                  {CATEGORIA_LABEL[papel] ?? papel}
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Permissões exigidas
            </p>
            <ul className="space-y-1">
              {etapa.recursos.map((recurso) => (
                <li
                  key={recurso}
                  className="rounded-lg bg-surface-sunken px-2 py-1 font-mono text-xs break-all"
                >
                  {recurso}
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Segue para
            </p>
            <ul className="space-y-1.5">
              {etapa.saidas.map((saida) => (
                <li
                  key={saida}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground"
                >
                  <ArrowRight className="size-3.5 shrink-0" aria-hidden />
                  {saida}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {etapa.href ? (
          <div>
            <Button asChild variant="outline" size="sm">
              <Link href={etapa.href}>{etapa.hrefRotulo ?? "Abrir"}</Link>
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
