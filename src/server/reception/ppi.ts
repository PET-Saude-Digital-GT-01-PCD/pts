import { db } from "@/lib/db";

// Pactuação Programada Integrada por município de origem (PRD M1).
// ponytail: PPI decidida a nível de município; upgrade = por UBS quando o
// piloto precisar de granularidade menor que o município.

export type PpiLocalResumo = { pactuado: boolean; vigenciaAte: Date | null } | null;

/** Função pura: PPI está pactuada agora? Sem registro = não pactuada;
 * pactuada com vigência vencida = não pactuada. */
export function ppiPactuadaAgora(ppi: PpiLocalResumo, agora: Date): boolean {
  if (!ppi) return false;
  if (!ppi.pactuado) return false;
  if (ppi.vigenciaAte && ppi.vigenciaAte.getTime() < agora.getTime()) return false;
  return true;
}

/** Dias até o prazo de regularização (negativo = já vencido). */
export function diasAteRegularizacao(prazo: Date, agora: Date): number {
  const DIA_MS = 24 * 60 * 60 * 1000;
  return Math.ceil((prazo.getTime() - agora.getTime()) / DIA_MS);
}

export const PRAZO_REGULARIZACAO_DIAS = 15;
const JANELA_ALERTA_DIAS = 5;

export async function buscarPpiLocal(
  cerId: string,
  municipioOrigem: string,
): Promise<PpiLocalResumo> {
  const ppi = await db.ppiLocal.findUnique({
    where: { cerId_municipioOrigem: { cerId, municipioOrigem } },
    select: { pactuado: true, vigenciaAte: true },
  });
  return ppi;
}

export type PacienteProvisorioAlerta = {
  id: string;
  nome: string;
  municipioOrigem: string | null;
  prazoRegularizacao: Date;
  diasRestantes: number;
};

/** Pacientes provisórios com prazo vencido ou próximo (≤5 dias) — para o
 * alerta agregado do dashboard de recepção/triagem. */
export async function listarAlertasRegularizacaoPpi(
  cerId: string,
  agora: Date = new Date(),
): Promise<PacienteProvisorioAlerta[]> {
  const limite = new Date(agora.getTime() + JANELA_ALERTA_DIAS * 24 * 60 * 60 * 1000);
  const rows = await db.paciente.findMany({
    where: {
      cerId,
      provisorio: true,
      prazoRegularizacao: { lte: limite },
    },
    orderBy: { prazoRegularizacao: "asc" },
    select: { id: true, nome: true, municipioOrigem: true, prazoRegularizacao: true },
  });
  return rows
    .filter((r) => r.prazoRegularizacao !== null)
    .map((r) => ({
      id: r.id,
      nome: r.nome,
      municipioOrigem: r.municipioOrigem,
      prazoRegularizacao: r.prazoRegularizacao!,
      diasRestantes: diasAteRegularizacao(r.prazoRegularizacao!, agora),
    }));
}
