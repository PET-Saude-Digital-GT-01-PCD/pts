/**
 * Abas da área administrativa. Espelham o NAV_CONFIG da lateral, mas em um
 * subconjunto: aqui só entra tela de administração/governança, e a ordem é a
 * do trabalho do gestor (visão → fluxo → pessoas → configuração → histórico).
 */
export type ItemAdmin = {
  chave: string;
  label: string;
  href: string;
  /** Recurso RBAC exigido; null = qualquer usuário autenticado. */
  requer: string | null;
};

export const ITENS_ADMIN: readonly ItemAdmin[] = [
  { chave: "visao", label: "Visão geral", href: "/dashboard", requer: "governanca.dashboard.ver" },
  { chave: "fluxo", label: "Fluxo do cuidado", href: "/dashboard/fluxo", requer: "governanca.dashboard.ver" },
  { chave: "usuarios", label: "Usuários", href: "/dashboard/usuarios", requer: "admin.usuarios.ver" },
  { chave: "papeis", label: "Papéis", href: "/dashboard/papeis", requer: "admin.papeis.gerenciar" },
  { chave: "integracoes", label: "Integrações", href: "/dashboard/integracoes", requer: "admin.config.org.editar" },
  { chave: "equipes", label: "Equipes", href: "/dashboard/casos", requer: "care-plan.equipe.gerenciar" },
  { chave: "identidade", label: "Identidade visual", href: "/dashboard/config-org", requer: "admin.config.org.editar" },
  { chave: "indicadores", label: "Indicadores", href: "/governanca", requer: "governanca.dashboard.ver" },
  { chave: "auditoria", label: "Auditoria", href: "/governanca/auditoria", requer: "governanca.auditoria.ver" },
];

/** Abas visíveis para quem tem estes recursos. Puro. */
export function itensAdmin(recursos: string[]): ItemAdmin[] {
  return ITENS_ADMIN.filter(
    (item) => item.requer === null || recursos.includes(item.requer),
  );
}
