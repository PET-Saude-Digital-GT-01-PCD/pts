import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { AdminShell } from "@/components/admin/admin-shell";
import { Button } from "@/components/ui/button";
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
    <AdminShell
      titulo={detalhe.pacienteNome}
      descricao={`Referência do caso: ${detalhe.refProfissionalNome ?? "—"}`}
      largura="estreita"
      acoes={
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard/casos">
            <ArrowLeft aria-hidden />
            Voltar aos casos
          </Link>
        </Button>
      }
    >
      <EquipeForm detalhe={detalhe} />
    </AdminShell>
  );
}
