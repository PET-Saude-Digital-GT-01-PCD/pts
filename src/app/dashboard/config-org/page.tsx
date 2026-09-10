import { requirePermissao } from "@/server/iam/session";
import { buscarOrgConfigView } from "@/server/iam/org-config";
import { ConfigOrgForm } from "./config-org-form";

export default async function ConfigOrgPage() {
  await requirePermissao("admin.config.org.editar");
  const orgConfig = await buscarOrgConfigView();

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-8 p-8">
      <div>
        <h1 className="text-2xl font-semibold">Identidade visual</h1>
        <p className="text-sm text-muted-foreground">
          Nome, logo e parceiros exibidos no cabeçalho, rodapé e título da
          plataforma. Só por URL — sem upload de arquivo.
        </p>
      </div>
      <ConfigOrgForm orgConfig={orgConfig} />
    </main>
  );
}
