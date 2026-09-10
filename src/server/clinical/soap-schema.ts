import { z } from "zod";

import { GRUPOS_ASHWORTH } from "@/server/clinical/escalas";

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

// Escalas clínicas estruturadas do bloco O (#66): Ashworth (0–4 por grupo) e
// Glasgow (ocular 1–4 / verbal 1–5 / motor 1–6). Score calculado em escalas.ts.
const escala0a4 = z.coerce.number().int().min(0).max(4).nullable();

const ashworthSchema = z
  .object(
    Object.fromEntries(GRUPOS_ASHWORTH.map((grupo) => [grupo, escala0a4])) as Record<
      (typeof GRUPOS_ASHWORTH)[number],
      typeof escala0a4
    >,
  )
  .partial();

const glasgowSchema = z
  .object({
    ocular: z.coerce.number().int().min(1).max(4).nullable(),
    verbal: z.coerce.number().int().min(1).max(5).nullable(),
    motor: z.coerce.number().int().min(1).max(6).nullable(),
  })
  .partial();

const escalasObjetivoSchema = z
  .object({
    ashworth: ashworthSchema,
    glasgow: glasgowSchema,
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
  escalasObjetivo: escalasObjetivoSchema.optional(),
});
