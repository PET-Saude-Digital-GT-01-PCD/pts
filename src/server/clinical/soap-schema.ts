import { z } from "zod";

export const itemGradeServicosSchema = z.object({
  servico: z.string().trim().min(1, "Serviço obrigatório."),
  frequencia: z.string().trim().min(1, "Frequência obrigatória."),
  duracao: z.string().trim().min(1, "Duração obrigatória."),
  justificativa: z.string().trim().min(1, "Justificativa obrigatória."),
});

export const avaliacaoSoapSchema = z.object({
  subjetivo: z.string().trim().min(1, "Campo S obrigatório."),
  objetivo: z.string().trim().min(1, "Campo O obrigatório."),
  avaliacao: z.string().trim().min(1, "Campo A obrigatório."),
  plano: z.object({
    gradeServicos: z.array(itemGradeServicosSchema),
  }),
});
