import type { Semaforo } from "@prisma/client";

/**
 * Classificação vigente = ajuste mais recente; sem ajustes, a original.
 * (append-only: a triagem original nunca é alterada)
 */
export function classificacaoVigente(
  original: Semaforo,
  ultimoAjuste?: { para: Semaforo } | null,
): Semaforo {
  return ultimoAjuste?.para ?? original;
}
