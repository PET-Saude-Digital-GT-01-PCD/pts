import { requirePermissao } from "@/server/iam/session";
import { listarTiposEntidade } from "@/server/governance/auditoria";
import { AuditoriaViewer } from "./auditoria-viewer";

export default async function AuditoriaPage() {
  await requirePermissao("governanca.auditoria.ver");
  const tiposEntidade = await listarTiposEntidade();

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 p-8">
      <div>
        <h1 className="text-2xl font-semibold">Trilha de auditoria</h1>
        <p className="text-sm text-muted-foreground">
          Histórico append-only das decisões e ajustes. Metadados apenas —
          sem abrir o conteúdo clínico completo.
        </p>
      </div>
      <AuditoriaViewer tiposEntidade={tiposEntidade} />
    </main>
  );
}
