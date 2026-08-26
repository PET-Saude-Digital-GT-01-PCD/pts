"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { requirePermissao } from "@/server/iam/session";
import type { BaselinePaciente } from "@/server/integrations/canonical";
import { MockBaselineSource } from "@/server/integrations/sources/mock";
import {
  type CamposBaseline,
  mesclarComImportacao,
  ORIGENS_DIGITADAS,
} from "./baseline-campos";

// Degradacão: porta indisponível/timeout ≤5s → erro capturado, fluxo segue
// com pendência (ADR-0008: e-SUS periférico, fluxo clínico nunca trava).

const TIMEOUT_MS = 5000;

export type ResultadoBuscaBaseline =
  | { status: "ok"; baseline: BaselinePaciente }
  | { status: "nao_encontrado" }
  | { status: "indisponivel" };

const BUSCAR_SCHEMA = z.object({
  identificador: z.string().min(5).max(20),
});

async function comTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return await Promise.race([
    p,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), ms),
    ),
  ]);
}

/** Busca via porta `BaselineSource`. Nunca lança para o chamador da UI. */
export async function buscarBaseline(
  input: z.infer<typeof BUSCAR_SCHEMA>,
): Promise<ResultadoBuscaBaseline> {
  await requirePermissao("recepcao.baseline.ver");
  const { identificador } = BUSCAR_SCHEMA.parse(input);

  // ponytail: switch fixo por env (dev=mock); DI framework só quando houver
  // segunda fonte real (e-SUS/RNDS no piloto).
  const source = new MockBaselineSource();
  try {
    const baseline = await comTimeout(source.getBaseline(identificador), TIMEOUT_MS);
    if (!baseline) return { status: "nao_encontrado" };
    return { status: "ok", baseline };
  } catch {
    return { status: "indisponivel" };
  }
}

const SALVAR_SCHEMA = z.object({
  pacienteId: z.string().uuid(),
  campos: z.object({
    diagnosticos: z.array(z.string()),
    alergias: z.array(z.string()),
    medicacoes: z.array(
      z.object({ nome: z.string(), dosagem: z.string().nullable() }),
    ),
    internacoes: z.array(z.string()),
  }),
  origens: z.object({
    diagnosticos: z.enum(["importado", "digitado"]),
    alergias: z.enum(["importado", "digitado"]),
    medicacoes: z.enum(["importado", "digitado"]),
    internacoes: z.enum(["importado", "digitado"]),
  }),
});

/** Persiste baseline com origem por campo + auditoria na mesma transação. */
export async function salvarBaseline(input: z.infer<typeof SALVAR_SCHEMA>) {
  const usuario = await requirePermissao("recepcao.paciente.cadastrar");
  const { pacienteId, campos, origens } = SALVAR_SCHEMA.parse(input);

  const dados = {
    diagnosticosJson: campos.diagnosticos,
    alergiasJson: campos.alergias,
    medicacoesJson: campos.medicacoes,
    internacoesJson: campos.internacoes,
    origemJson: origens,
  };

  return await db.$transaction(async (tx) => {
    const baseline = await tx.baseline.upsert({
      where: { pacienteId },
      create: { pacienteId, ...dados },
      update: dados,
    });
    await tx.auditoria.create({
      data: {
        actorId: usuario.id,
        action: "baseline.salva",
        entityType: "Baseline",
        entityId: pacienteId,
        afterJson: { origens },
      },
    });
    return baseline;
  });
}

const IMPORTAR_SCHEMA = z.object({
  pacienteId: z.string().uuid(),
  identificador: z.string().min(5).max(20),
});

/**
 * Fluxo completo da issue: busca via porta e persiste com origem
 * `importado` nos campos que vieram da fonte. Degrada sem travar.
 */
export async function importarBaseline(
  input: z.infer<typeof IMPORTAR_SCHEMA>,
): Promise<ResultadoBuscaBaseline> {
  const usuario = await requirePermissao("recepcao.paciente.cadastrar");
  const { pacienteId, identificador } = IMPORTAR_SCHEMA.parse(input);

  const anterior = await db.baseline.findUnique({ where: { pacienteId } });

  // busca direto pela porta (sem exigir recepcao.baseline.ver duas vezes)
  // ponytail: switch fixo por env (dev=mock); trocar quando piloto definir fonte
  const source = new MockBaselineSource();
  let resultado: ResultadoBuscaBaseline;
  try {
    const baseline = await comTimeout(
      source.getBaseline(identificador),
      TIMEOUT_MS,
    );
    resultado = baseline ? { status: "ok", baseline } : { status: "nao_encontrado" };
  } catch {
    return { status: "indisponivel" };
  }

  if (resultado.status !== "ok") return resultado;

  const importada: CamposBaseline = {
    diagnosticos: resultado.baseline.diagnosticos,
    alergias: resultado.baseline.alergias,
    medicacoes: resultado.baseline.medicacoes,
    internacoes: resultado.baseline.internacoes,
  };
  const atuais: CamposBaseline = {
    diagnosticos: (anterior?.diagnosticosJson as string[] | null) ?? [],
    alergias: (anterior?.alergiasJson as string[] | null) ?? [],
    medicacoes:
      (anterior?.medicacoesJson as CamposBaseline["medicacoes"] | null) ?? [],
    internacoes: (anterior?.internacoesJson as string[] | null) ?? [],
  };
  const origensAnteriores =
    (anterior?.origemJson as typeof ORIGENS_DIGITADAS | null) ??
    ORIGENS_DIGITADAS;

  // re-import não sobrescreve campo preenchido à mão com conteúdo diferente
  const { campos, origens } = mesclarComImportacao(
    atuais,
    origensAnteriores,
    importada,
  );

  await db.$transaction(async (tx) => {
    const dados = {
      diagnosticosJson: campos.diagnosticos,
      alergiasJson: campos.alergias,
      medicacoesJson: campos.medicacoes,
      internacoesJson: campos.internacoes,
      origemJson: origens,
    };
    await tx.baseline.upsert({
      where: { pacienteId },
      create: { pacienteId, ...dados },
      update: dados,
    });
    await tx.auditoria.create({
      data: {
        actorId: usuario.id,
        action: "baseline.importada",
        entityType: "Baseline",
        entityId: pacienteId,
        afterJson: {
          identificador,
          contagens: contagens(importada),
          origens,
        },
      },
    });
  });

  return resultado;
}

function contagens(c: CamposBaseline) {
  return {
    diagnosticos: c.diagnosticos.length,
    alergias: c.alergias.length,
    medicacoes: c.medicacoes.length,
    internacoes: c.internacoes.length,
  };
}
