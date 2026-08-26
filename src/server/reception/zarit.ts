export const ZARIT_ALTO = 12;

export function zaritAlto(zaritScore: number | null | undefined): boolean {
  return typeof zaritScore === "number" && zaritScore >= ZARIT_ALTO;
}
