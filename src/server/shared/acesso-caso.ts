import { db } from "@/lib/db";

// Vínculo ao caso (#69): acesso clínico individual exige ser a referência do
// PTS (Pts.refProfissionalId) ou membro da equipe vinculada (EquipePts) —
// além da permissão (recurso) global já checada em cada usecase. GESTOR
// nunca passa por aqui: sua visão é sempre agregada (dashboard/relatórios),
// nunca o conteúdo clínico individual de um caso.

export function avaliarVinculoCaso(
  userId: string,
  pts: { refProfissionalId: string | null },
  membrosEquipeIds: string[],
): boolean {
  return pts.refProfissionalId === userId || membrosEquipeIds.includes(userId);
}

export async function podeAcessarCaso(userId: string, ptsId: string): Promise<boolean> {
  const pts = await db.pts.findUnique({
    where: { id: ptsId },
    select: { refProfissionalId: true, equipePts: { select: { usuarioId: true } } },
  });
  if (!pts) return false;
  return avaliarVinculoCaso(
    userId,
    pts,
    pts.equipePts.map((m) => m.usuarioId),
  );
}
