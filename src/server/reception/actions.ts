"use server"

import { z } from "zod"
import { db } from "@/lib/db"
import { requirePermissao } from "@/server/iam/session"
import {
  mockBaselineSource,
  type BaselineResult,
  type BaselineSource,
} from "./baseline-source"

// ===== Schema Zod =====

const buscarBaselineSchema = z.object({
  cpfOuCns: z
    .string()
    .min(1, "CPF ou CNS é obrigatório")
    .transform((v) => v.trim()),
})

const salvarBaselineSchema = z.object({
  pacienteId: z.string().uuid("ID do paciente inválido"),
  cpfOuCns: z.string().min(1),
  diagnosticosJson: z.array(z.object({ cid10: z.string(), descricao: z.string() })),
  alergiasJson: z.array(z.object({ agente: z.string(), reacao: z.string().optional() })),
  medicacoesJson: z.array(
    z.object({ nome: z.string(), dose: z.string().optional(), via: z.string().optional() })
  ),
  internacoesJson: z.array(
    z.object({
      motivo: z.string(),
      dataInicio: z.string().optional(),
      dataFim: z.string().optional(),
    })
  ),
  origemJson: z.record(z.enum(["importado", "digitado"])),
})

// ===== Fonte configurável (injetável em testes) =====

let _source: BaselineSource = mockBaselineSource

/** Permite injetar um BaselineSource diferente (usado em testes). */
export async function setBaselineSource(source: BaselineSource) {
  _source = source
}

// ===== Actions =====

/**
 * Busca a linha de base clínica no e-SUS (ou mock) por CPF/CNS.
 * Não persiste dados. Retorna prévia para o usuário revisar antes de salvar.
 *
 * Permissões: recepcao.baseline.ver (RBAC granular via requirePermissao).
 * Degradação: timeout de 5s → retorna status "indisponivel" sem lançar exceção.
 */
export async function buscarBaseline(
  formData: FormData
): Promise<BaselineResult> {
  await requirePermissao("recepcao.baseline.ver")

  const raw = buscarBaselineSchema.safeParse({
    cpfOuCns: formData.get("cpfOuCns"),
  })

  if (!raw.success) {
    return { status: "indisponivel" }
  }

  try {
    const timeoutPromise = new Promise<BaselineResult>((resolve) =>
      setTimeout(() => resolve({ status: "indisponivel" }), 5_000)
    )
    const buscaPromise = _source.getBaseline(raw.data.cpfOuCns)
    const resultado = await Promise.race([buscaPromise, timeoutPromise])
    return resultado
  } catch {
    // ponytail: logar erro em serviço de observabilidade quando disponível
    return { status: "indisponivel" }
  }
}

/**
 * Persiste a linha de base revisada pelo profissional de saúde.
 * Faz upsert no modelo Baseline e registra auditoria na mesma transação.
 *
 * Permissões: recepcao.paciente.cadastrar (RBAC granular via requirePermissao).
 */
export async function salvarBaseline(
  formData: FormData
): Promise<{ ok: true } | { ok: false; erro: string }> {
  const session = await requirePermissao("recepcao.paciente.cadastrar")

  const raw = salvarBaselineSchema.safeParse({
    pacienteId: formData.get("pacienteId"),
    cpfOuCns: formData.get("cpfOuCns"),
    diagnosticosJson: JSON.parse((formData.get("diagnosticosJson") as string) ?? "[]"),
    alergiasJson: JSON.parse((formData.get("alergiasJson") as string) ?? "[]"),
    medicacoesJson: JSON.parse((formData.get("medicacoesJson") as string) ?? "[]"),
    internacoesJson: JSON.parse((formData.get("internacoesJson") as string) ?? "[]"),
    origemJson: JSON.parse((formData.get("origemJson") as string) ?? "{}"),
  })

  if (!raw.success) {
    return { ok: false, erro: "Dados inválidos: " + raw.error.message }
  }

  const {
    pacienteId,
    diagnosticosJson,
    alergiasJson,
    medicacoesJson,
    internacoesJson,
    origemJson,
  } = raw.data

  try {
    await db.$transaction(async (tx) => {
      const baseline = await tx.baseline.upsert({
        where: { pacienteId },
        update: {
          diagnosticosJson,
          alergiasJson,
          medicacoesJson,
          internacoesJson,
          origemJson,
          importadoEm: new Date(),
        },
        create: {
          pacienteId,
          diagnosticosJson,
          alergiasJson,
          medicacoesJson,
          internacoesJson,
          origemJson,
        },
      })

      // Auditoria append-only (AGENTS.md: toda mutação crítica grava auditoria)
      await tx.auditoria.create({
        data: {
          actorId: session.id as string,
          action: "baseline.importar",
          entityType: "Baseline",
          entityId: baseline.id,
          afterJson: { diagnosticosJson, alergiasJson, medicacoesJson, internacoesJson, origemJson },
          motivo: "Importação/revisão de linha de base clínica",
        },
      })
    })

    return { ok: true }
  } catch (err) {
    console.error("[salvarBaseline]", err)
    return { ok: false, erro: "Falha ao salvar. Tente novamente." }
  }
}
