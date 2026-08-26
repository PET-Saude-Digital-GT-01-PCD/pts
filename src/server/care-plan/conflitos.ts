import type { CategoriaProfissional, StatusMeta } from "@prisma/client";

export type MetaParaConflito = {
  id: string;
  ptsId: string;
  status: StatusMeta;
  dataPactuacao: Date;
  prazo: Date;
  /** Campo opcional dentro de criteriosJson (decisão automática, plano/13 §11). */
  dominioFuncional: string | null;
  donoCategoria: CategoriaProfissional | null;
};

export type ConflitoMeta = {
  tipo: "PRAZO" | "FOCO";
  metaAId: string;
  metaBId: string;
  detalhe: string;
};

const ATIVAS: StatusMeta[] = ["NOVA", "EM_ANDAMENTO"];

// ponytail: O(n²) par a par — teto ok para dezenas de metas por PTS; índice por
// domínio/janela quando houver centenas.
export function verificarConflitoMetas(
  metas: MetaParaConflito[],
): ConflitoMeta[] {
  const ativas = metas.filter((m) => ATIVAS.includes(m.status));
  const conflitos: ConflitoMeta[] = [];

  for (let i = 0; i < ativas.length; i++) {
    for (let j = i + 1; j < ativas.length; j++) {
      const a = ativas[i]!;
      const b = ativas[j]!;

      // Janelas [dataPactuacao, prazo]: interseção semiaberta (encostar não conta).
      const prazoIntersecta =
        a.dataPactuacao.getTime() < b.prazo.getTime() &&
        b.dataPactuacao.getTime() < a.prazo.getTime();
      if (prazoIntersecta) {
        conflitos.push({
          tipo: "PRAZO",
          metaAId: a.id,
          metaBId: b.id,
          detalhe: `Janelas sobrepostas (${fmt(a.dataPactuacao)}–${fmt(a.prazo)}) e (${fmt(b.dataPactuacao)}–${fmt(b.prazo)}).`,
        });
      }

      const mesmoDominio =
        a.dominioFuncional !== null &&
        b.dominioFuncional !== null &&
        a.dominioFuncional === b.dominioFuncional;
      const especialidadesDiferentes =
        a.donoCategoria !== b.donoCategoria;
      if (mesmoDominio && especialidadesDiferentes) {
        conflitos.push({
          tipo: "FOCO",
          metaAId: a.id,
          metaBId: b.id,
          detalhe: `Domínio "${a.dominioFuncional}" disputado entre ${a.donoCategoria ?? "?"} e ${b.donoCategoria ?? "?"}.`,
        });
      }
    }
  }

  return conflitos;
}

function fmt(d: Date): string {
  return d.toISOString().slice(0, 10);
}
