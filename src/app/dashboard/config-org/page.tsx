import { AdminPanel, AdminShell } from "@/components/admin/admin-shell";
import { requirePermissao } from "@/server/iam/session";
import { buscarOrgConfigView } from "@/server/iam/org-config";
import { ConfigOrgForm } from "./config-org-form";

export default async function ConfigOrgPage() {
  await requirePermissao("admin.config.org.editar");
  const orgConfig = await buscarOrgConfigView();

  return (
    <AdminShell
      titulo="Identidade visual"
      descricao="Nome, logo e parceiros exibidos no cabeçalho, no rodapé e no título da plataforma. Só por URL — sem upload de arquivo."
      largura="estreita"
    >
      <AdminPanel>
        <ConfigOrgForm orgConfig={orgConfig} />
      </AdminPanel>
    </AdminShell>
  );
}
