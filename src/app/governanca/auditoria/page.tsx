import { AdminShell } from "@/components/admin/admin-shell";
import { requirePermissao } from "@/server/iam/session";
import { listarTiposEntidade } from "@/server/governance/auditoria";
import { AuditoriaViewer } from "./auditoria-viewer";

export default async function AuditoriaPage() {
  await requirePermissao("governanca.auditoria.ver");
  const tiposEntidade = await listarTiposEntidade();

  return (
    <AdminShell
      titulo="Trilha de auditoria"
      descricao="Histórico append-only das decisões e ajustes. Metadados apenas — sem abrir o conteúdo clínico completo."
      largura="larga"
    >
      <AuditoriaViewer tiposEntidade={tiposEntidade} />
    </AdminShell>
  );
}
