import { db } from "@/lib/db";

// Leitura dos acessos emitidos para o cartão do paciente. O código em claro
// nunca é recuperável (só o hash existe no banco) — ele só aparece na
// resposta da emissão, uma única vez.

export type AcessoPortalView = {
  id: string;
  emitidoEm: Date;
  validoAte: Date;
  usadoEm: Date | null;
  revogadoEm: Date | null;
};

export async function buscarAcessosPortal(
  pacienteId: string,
): Promise<AcessoPortalView[]> {
  return db.acessoCidadao.findMany({
    where: { pacienteId },
    orderBy: { emitidoEm: "desc" },
    select: {
      id: true,
      emitidoEm: true,
      validoAte: true,
      usadoEm: true,
      revogadoEm: true,
    },
  });
}
