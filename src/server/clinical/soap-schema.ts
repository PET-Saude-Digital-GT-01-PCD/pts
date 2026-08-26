import { z } from "zod";

export const itemGradeServicosSchema = z.object({
  servico: z.string().trim().min(1, "Serviço obrigatório."),
  frequencia: z.string().trim().min(1, "Frequência obrigatória."),
  duracao: z.string().trim().min(1, "Duração obrigatória."),
  justificativa: z.string().trim().min(1, "Justificativa obrigatória."),
});

// Divergência saudável (#22): escalas 0–100 opcionais (0 = pior, 100 = melhor).
const escala0a100 = z.coerce.number().int().min(0).max(100).nullable();

const relatoFamiliaSchema = z
  .object({
    mobilidadeRelatada: escala0a100,
    expectativaRecuperacao: escala0a100,
    autonomiaRelatada: escala0a100,
  })
  .partial();

const medidasClinicasSchema = z
  .object({
    mobilidadeMedida: escala0a100,
    prognosticoClinico: escala0a100,
    autonomiaObservada: escala0a100,
  })
  .partial();

export const avaliacaoSoapSchema = z.object({
  subjetivo: z.string().trim().min(1, "Campo S obrigatório."),
  objetivo: z.string().trim().min(1, "Campo O obrigatório."),
  avaliacao: z.string().trim().min(1, "Campo A obrigatório."),
  plano: z.object({
    gradeServicos: z.array(itemGradeServicosSchema),
  }),
  relato: relatoFamiliaSchema.optional(),
  avaliacaoClinica: medidasClinicasSchema.optional(),
});
