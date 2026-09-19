import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * Estado vazio padrão de listas e buscas: ícone opcional, título, descrição e ação.
 */
function EmptyState({
  icon: Icon,
  titulo,
  descricao,
  acao,
  className,
}: {
  icon?: LucideIcon
  titulo: string
  descricao?: string
  acao?: React.ReactNode
  className?: string
}) {
  return (
    <div
      data-slot="empty-state"
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border px-4 py-8 text-center",
        className
      )}
    >
      {Icon ? (
        <Icon className="size-6 text-muted-foreground" aria-hidden />
      ) : null}
      <p className="text-sm font-medium text-foreground">{titulo}</p>
      {descricao ? (
        <p className="max-w-prose text-sm text-muted-foreground">{descricao}</p>
      ) : null}
      {acao ? <div className="mt-2">{acao}</div> : null}
    </div>
  )
}

export { EmptyState }
