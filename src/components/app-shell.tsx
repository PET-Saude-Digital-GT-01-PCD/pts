import { getSessaoComRecursos } from "@/server/iam/session";
import { buscarOrgConfigView } from "@/server/iam/org-config";
import { Sidebar } from "@/components/sidebar";
import { ImpersonacaoBanner } from "@/components/impersonacao-banner";

const NAV_CONFIG = [
  { requires: null, label: "Dashboard", href: "/dashboard", icon: "LayoutDashboard" },
  { requires: "recepcao.paciente.cadastrar", label: "Recepção", href: "/recepcao", icon: "UserPlus" },
  { requires: "recepcao.paciente.cadastrar", label: "Novo paciente", href: "/recepcao/novo", icon: "UserPlus" },
  { requires: "agenda.atendimentos.ver", label: "Agenda", href: "/agenda", icon: "CalendarDays" },
  { requires: "triage.triagem.escrever", label: "Triagem", href: "/triagem", icon: "ClipboardList" },
  { requires: "care-plan.meta.escrever", label: "Metas", href: "/metas", icon: "Target" },
  { requires: "governanca.dashboard.ver", label: "Fluxo do cuidado", href: "/dashboard/fluxo", icon: "Workflow" },
  { requires: "admin.usuarios.ver", label: "Usuários", href: "/dashboard/usuarios", icon: "Users" },
  { requires: "admin.papeis.gerenciar", label: "Papéis", href: "/dashboard/papeis", icon: "ShieldCheck" },
  { requires: "admin.config.org.editar", label: "Identidade visual", href: "/dashboard/config-org", icon: "Settings" },
  { requires: "care-plan.equipe.gerenciar", label: "Equipes dos casos", href: "/dashboard/casos", icon: "Users" },
  { requires: "governanca.auditoria.ver", label: "Auditoria", href: "/governanca/auditoria", icon: "FileText" },
  { requires: "governanca.dashboard.ver", label: "Indicadores", href: "/governanca", icon: "BarChart3" },
] as const;

export async function AppShell({ children }: { children: React.ReactNode }) {
  const [{ user, recursos }, orgConfig] = await Promise.all([
    getSessaoComRecursos(),
    buscarOrgConfigView(),
  ]);

  if (!user) {
    return <>{children}</>;
  }

  const itens = NAV_CONFIG.filter((item) => {
    if (!item.requires) return true;
    return recursos.includes(item.requires);
  }).map((item) => ({
    label: item.label,
    href: item.href,
    icon: item.icon,
  }));

  return (
    <div className="flex h-dvh flex-col overflow-hidden lg:flex-row">
      <Sidebar
        itens={itens}
        user={{
          nome: user.nome,
          email: user.email,
          nomePapel: user.nomePapel,
          categoria: user.categoria,
        }}
        orgConfig={orgConfig}
      />
      <div className="flex-1 overflow-y-auto">
        <ImpersonacaoBanner />
        {children}
      </div>
    </div>
  );
}
