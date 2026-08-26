export type EntradaReuniao = {
  divergenciaEspecialidades: boolean;
  conflitosMeta: number;
  eventoRisco: boolean;
  pendenciaAjuste: boolean;
};

// ponytail: heurística v1 de classificação da reunião (plano/13 §11);
// validar no piloto — upgrade = regras configuráveis por CER.
export function semaforoDeReuniao(
  e: EntradaReuniao,
): "VERDE" | "AMARELO" | "VERMELHO" {
  if (e.divergenciaEspecialidades || e.conflitosMeta > 0 || e.eventoRisco) {
    return "VERMELHO";
  }
  if (e.pendenciaAjuste) return "AMARELO";
  return "VERDE";
}
