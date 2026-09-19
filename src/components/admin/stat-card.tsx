import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export type StatTom = "neutro" | "primario" | "sucesso" | "alerta" | "critico";

const TOM_ICONE: Record<StatTom, string> = {
  neutro: "bg-muted text-muted-foreground",
  primario: "bg-primary/10 text-primary",
  sucesso: "bg-success/15 text-success",
  alerta: "bg-warning/15 text-warning",
  critico: "bg-destructive/10 text-destructive",
};

/**
 * Número em destaque das telas de gestão: rótulo, valor e uma pista de
 * contexto (origem do dado ou comparação).
 */
export function StatCard({
  rotulo,
  valor,
  pista,
  icon: Icon,
  tom = "neutro",
  className,
}: {
  rotulo: string;
  valor: React.ReactNode;
  pista?: React.ReactNode;
  icon?: LucideIcon;
  tom?: StatTom;
  className?: string;
}) {
  return (
    <div
      data-slot="stat-card"
      className={cn(
        "flex items-start justify-between gap-3 rounded-2xl bg-surface-raised p-5 shadow-soft ring-1 ring-foreground/5",
        className,
      )}
    >
      <div className="min-w-0 space-y-1">
        <p className="text-sm text-muted-foreground">{rotulo}</p>
        <p className="text-3xl font-semibold tracking-tight tabular-nums">
          {valor}
        </p>
        {pista ? (
          <p className="text-xs text-muted-foreground">{pista}</p>
        ) : null}
      </div>
      {Icon ? (
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-2xl",
            TOM_ICONE[tom],
          )}
        >
          <Icon className="size-5" aria-hidden />
        </span>
      ) : null}
    </div>
  );
}
