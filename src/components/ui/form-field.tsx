"use client"

import * as React from "react"

import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

/**
 * Campo de formulário com label, dica e erro ligados por aria ao controle.
 * O filho recebe id, aria-invalid e aria-describedby via render prop.
 */
function FormField({
  id,
  label,
  dica,
  erro,
  obrigatorio,
  className,
  children,
}: {
  id: string
  label: string
  dica?: string
  erro?: string | null
  obrigatorio?: boolean
  className?: string
  children: (aria: {
    id: string
    "aria-invalid": boolean | undefined
    "aria-describedby": string | undefined
  }) => React.ReactNode
}) {
  const dicaId = dica ? `${id}-dica` : undefined
  const erroId = erro ? `${id}-erro` : undefined
  const describedBy = [dicaId, erroId].filter(Boolean).join(" ") || undefined

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={id}>
        {label}
        {obrigatorio ? (
          <span className="text-destructive" aria-hidden>
            *
          </span>
        ) : null}
        {obrigatorio ? <span className="sr-only"> (obrigatório)</span> : null}
      </Label>
      {children({
        id,
        "aria-invalid": erro ? true : undefined,
        "aria-describedby": describedBy,
      })}
      {dica ? (
        <p id={dicaId} className="text-xs text-muted-foreground">
          {dica}
        </p>
      ) : null}
      {erro ? (
        <p id={erroId} role="alert" className="text-xs font-medium text-destructive">
          {erro}
        </p>
      ) : null}
    </div>
  )
}

export { FormField }
