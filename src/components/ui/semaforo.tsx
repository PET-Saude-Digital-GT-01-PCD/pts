import { cn } from "@/lib/utils";

export type SemaforoStatus = "verde" | "amarelo" | "vermelho";

export const SEMAFORO_LABEL: Record<SemaforoStatus, string> = {
  verde: "Verde",
  amarelo: "Amarelo",
  vermelho: "Vermelho",
};

const SEMAFORO_CLASSES: Record<SemaforoStatus, string> = {
  verde: "bg-success/15 text-success",
  amarelo: "bg-warning/15 text-warning",
  vermelho: "bg-destructive/15 text-destructive",
};

const SEMAFORO_DOT: Record<SemaforoStatus, string> = {
  verde: "bg-success",
  amarelo: "bg-warning",
  vermelho: "bg-destructive",
};

export function semaforoClasses(status: SemaforoStatus): string {
  return SEMAFORO_CLASSES[status] ?? "bg-muted text-muted-foreground";
}

export function Semaforo({
  status,
  label,
  className,
}: {
  status: SemaforoStatus;
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        semaforoClasses(status),
        className
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "size-1.5 rounded-full",
          SEMAFORO_DOT[status] ?? "bg-muted"
        )}
      />
      {label ?? SEMAFORO_LABEL[status]}
    </span>
  );
}