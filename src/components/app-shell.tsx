import { getCurrentUser, recursosDoUsuario } from "@/server/iam/session";
import { Sidebar } from "@/components/sidebar";
import { SiteHeader } from "@/components/ui/site-header";

const NAV_CONFIG = [
  { requires: null, label: "Dashboard", href: "/dashboard", icon: "LayoutDashboard" },
  { requires: "recepcao.paciente.cadastrar", label: "Recepção", href: "/recepcao", icon: "UserPlus" },
  { requires: "recepcao.paciente.cadastrar", label: "Novo paciente", href: "/recepcao/novo", icon: "UserPlus" },
  { requires: "care-plan.meta.escrever", label: "Metas", href: "/metas", icon: "Target" },
  { requires: "admin.usuarios.ver", label: "Usuários", href: "/dashboard/usuarios", icon: "Users" },
  { requires: "admin.papeis.gerenciar", label: "Papéis", href: "/dashboard/papeis", icon: "ShieldCheck" },
  { requires: "governanca.dashboard.ver", label: "Indicadores", href: "/governanca", icon: "BarChart3" },
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

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        itens={itens}
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
