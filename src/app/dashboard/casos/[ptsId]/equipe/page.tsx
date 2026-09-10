import { notFound } from "next/navigation";

import { buscarEquipeCaso } from "@/server/care-plan/equipe";
import { EquipeForm } from "./equipe-form";

export default async function EquipeCasoPage({
  params,
}: {
  params: Promise<{ ptsId: string }>;
}) {
  const { ptsId } = await params;
  const detalhe = await buscarEquipeCaso(ptsId);
  if (!detalhe) notFound();

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-8">
      <div>
        <h1 className="text-2xl font-semibold">{detalhe.pacienteNome}</h1>
        <p className="text-sm text-muted-foreground">
          Referência do caso: {detalhe.refProfissionalNome ?? "—"}
        </p>
      </div>
      <EquipeForm detalhe={detalhe} />
    </main>
  );
}
