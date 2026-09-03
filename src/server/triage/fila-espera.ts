import { db } from "@/lib/db";
import { classificacaoVigente } from "@/server/triage/classificacao-vigente";

// Fila de espera amarela (#67): PTS com classificação vigente AMARELO, por CER,
// ordenados por antiguidade da triagem. Estimativa de tempo é heurística v1
// (ponytail: média móvel do intervalo entre as triagens recentes do CER ×
// posição na fila — proxy de cadência de atendimento; refinar com dados do
// piloto quando houver integração de agenda real).

const DIA_MS = 24 * 60 * 60 * 1000;
const INTERVALO_PADRAO_MS = DIA_MS; // sem histórico suficiente: assume 1 dia entre atendimentos
const JANELA_CADENCIA = 10; // últimas N triagens do CER usadas para a média móvel

export type EntradaFila = {
  ptsId: string;
  pacienteNome: string;
  triagemEm: Date;
};

export type ItemFila = EntradaFila & {
  posicao: number;
  estimativaDias: number;
};

/** Antiguidade da triagem: quem entrou na fila primeiro é chamado primeiro. */
export function ordenarFilaAmarela(entradas: EntradaFila[]): EntradaFila[] {
  return [...entradas].sort((a, b) => a.triagemEm.getTime() - b.triagemEm.getTime());
}

/** Média móvel dos intervalos entre admissões recentes; padrão quando há menos de 2 pontos. */
export function intervaloMedioAdmissoesMs(datasRecentes: Date[]): number {
  const ordenadas = [...datasRecentes].sort((a, b) => a.getTime() - b.getTime());
  if (ordenadas.length < 2) return INTERVALO_PADRAO_MS;

  let somaGaps = 0;
  for (let i = 1; i < ordenadas.length; i++) {
    somaGaps += ordenadas[i].getTime() - ordenadas[i - 1].getTime();
  }
  const media = somaGaps / (ordenadas.length - 1);
  return media > 0 ? media : INTERVALO_PADRAO_MS;
}

/** Posição (1-based) + estimativa em dias = posição × intervalo médio entre admissões. */
export function montarFilaAmarela(
  entradas: EntradaFila[],
  intervaloMedioMs: number,
): ItemFila[] {
  return ordenarFilaAmarela(entradas).map((entrada, i) => {
    const posicao = i + 1;
    return {
      ...entrada,
      posicao,
      estimativaDias: Math.round(((posicao * intervaloMedioMs) / DIA_MS) * 10) / 10,
    };
  });
}

export async function buscarFilaAmarela(cerId: string): Promise<ItemFila[]> {
  const [ptsAtivos, triagensRecentesCer] = await Promise.all([
    db.pts.findMany({
      where: { cerId, status: { not: "FECHADO" } },
      select: {
        id: true,
        paciente: { select: { nome: true } },
        triagens: {
          orderBy: { criadaEm: "desc" },
          take: 1,
          select: {
            classificacao: true,
            criadaEm: true,
            ajustes: { orderBy: { data: "desc" }, take: 1, select: { para: true } },
          },
        },
      },
    }),
    db.triagem.findMany({
      where: { pts: { cerId } },
      orderBy: { criadaEm: "desc" },
      take: JANELA_CADENCIA,
      select: { criadaEm: true },
    }),
  ]);

  const entradasAmarelo: EntradaFila[] = [];
  for (const pts of ptsAtivos) {
    const triagem = pts.triagens[0];
    if (!triagem) continue;
    const vigente = classificacaoVigente(triagem.classificacao, triagem.ajustes[0] ?? null);
    if (vigente !== "AMARELO") continue;
    entradasAmarelo.push({
      ptsId: pts.id,
      pacienteNome: pts.paciente.nome,
      triagemEm: triagem.criadaEm,
    });
  }

  const intervaloMedioMs = intervaloMedioAdmissoesMs(
    triagensRecentesCer.map((t) => t.criadaEm),
  );
  return montarFilaAmarela(entradasAmarelo, intervaloMedioMs);
}

export async function buscarPosicaoNaFila(
  ptsId: string,
  cerId: string,
): Promise<ItemFila | null> {
  const fila = await buscarFilaAmarela(cerId);
  return fila.find((item) => item.ptsId === ptsId) ?? null;
}
