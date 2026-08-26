import { getCurrentUser, recursosDoUsuario } from "@/server/iam/session";
import { Sidebar } from "@/components/sidebar";
import { SiteHeader } from "@/components/ui/site-header";

const NAV_CONFIG = [
  { requires: "governanca.dashboard.ver", label: "Visão geral", href: "/dashboard", icon: "LayoutDashboard" },
  { requires: null, label: "Meus casos", href: "/dashboard", icon: "LayoutDashboard" },
  { requires: "recepcao.paciente.cadastrar", label: "Recepção", href: "/recepcao", icon: "UserPlus" },
  { requires: "recepcao.paciente.cadastrar", label: "Novo paciente", href: "/recepcao/novo", icon: "UserPlus" },
  { requires: "triage.triagem.escrever", label: "Triagem", href: "/triagem", icon: "ClipboardList" },
  { requires: "clinical.soap.escrever", label: "SOAP", href: "/casos", icon: "Stethoscope" },
  { requires: "clinical.avaliacao.escrever", label: "Avaliações", href: "/casos", icon: "Activity" },
  { requires: "care-plan.pts.revisar", label: "Revisar PTS", href: "/casos", icon: "FileText" },
  { requires: "care-plan.meta.escrever", label: "Metas", href: "/metas", icon: "Target" },
  { requires: "care-plan.mural.escrever", label: "Mural", href: "/casos", icon: "MessageSquare" },
  { requires: "triage.triagem.ver", label: "Ver triagem", href: "/casos", icon: "ClipboardList" },
  { requires: "governanca.dashboard.ver", label: "Indicadores", href: "/dashboard", icon: "BarChart3" },
  { requires: "governanca.auditoria.ver", label: "Auditoria", href: "/dashboard/auditoria", icon: "ShieldCheck" },
  { requires: "admin.usuarios.ver", label: "Usuários", href: "/dashboard/usuarios", icon: "Users" },
  { requires: "admin.papeis.gerenciar", label: "Papéis", href: "/dashboard/papeis", icon: "ShieldCheck" },
] as const;

export async function AppShell({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <>
        <SiteHeader />
        {children}
      </>
    );
  }

  const recursos = await recursosDoUsuario(user.papelId);

  const itens = NAV_CONFIG.filter((item) => {
    if (!item.requires) return true;
    return recursos.includes(item.requires);
  }).map((item) => ({
    label: item.label,
    href: item.href,
    icon: item.icon,
  }));

  // Deduplicate by href (keep first occurrence per href)
  const seen = new Set<string>();
  const uniqueItens = itens.filter((item) => {
    if (seen.has(item.href)) return false;
    seen.add(item.href);
    return true;
  });

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        itens={uniqueItens}
        user={{
          nome: user.nome,
          email: user.email,
          nomePapel: user.nomePapel,
          categoria: user.categoria,
        }}
      />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
