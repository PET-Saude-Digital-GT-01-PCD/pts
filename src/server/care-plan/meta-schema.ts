import { z } from "zod";
import type { StatusMeta } from "@prisma/client";

export const metaInputSchema = z.object({
  ptsId: z.string().uuid(),
  avaliacaoId: z.string().uuid().optional(),
  donoId: z.string().uuid(),
  // Dupla linguagem obrigatória (plano/14 §4): técnica para a equipe + acessível para o paciente
  descTecnica: z.string().trim().min(3).max(500),
  descAcessivel: z.string().trim().min(3).max(500),
  // ponytail: critérios SMART livres em JSON; upgrade = schema estruturado por campo S-M-A-R-T
  criteriosJson: z.record(z.string(), z.unknown()),
  prazo: z.coerce.date(),
});

export const TRANSICOES_STATUS: Record<StatusMeta, StatusMeta[]> = {
  NOVA: ["EM_ANDAMENTO"],
  EM_ANDAMENTO: ["CONCLUIDA", "NAO_ALCANCADA"],
  CONCLUIDA: [],
  NAO_ALCANCADA: [],
};

export function transicaoStatusValida(
  de: StatusMeta,
  para: StatusMeta,
): boolean {
  if (de === para) return false;
  return TRANSICOES_STATUS[de].includes(para);
}
