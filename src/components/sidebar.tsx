"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  UserPlus,
  Users,
  ShieldCheck,
  Stethoscope,
  ClipboardList,
  Target,
  MessageSquare,
  BarChart3,
  FileText,
  LogOut,
  Heart,
  Activity,
  Brain,
  Settings,
} from "lucide-react";

import { Logo } from "@/components/ui/logo";
import { cn } from "@/lib/utils";
import type { OrgConfigView } from "@/server/iam/org-config-schema";

type NavItem = {
  label: string;
  href: string;
  icon: string;
};

type SidebarUser = {
  nome: string;
  email: string;
  nomePapel: string;
  categoria: string | null;
};

const ICONS: Record<string, React.ElementType> = {
  LayoutDashboard,
  UserPlus,
  Users,
  ShieldCheck,
  Stethoscope,
  ClipboardList,
  Target,
  MessageSquare,
  BarChart3,
  FileText,
  Heart,
  Activity,
  Brain,
  Settings,
};

const CATEGORIA_LABEL: Record<string, string> = {
  RECEPCAO: "Recepção",
  TRIADOR: "Triador",
  MEDICO: "Médico",
  FISIOTERAPEUTA: "Fisioterapeuta",
  TERAPEUTA_OCUPACIONAL: "Terapeuta Ocupacional",
  PSICOLOGO: "Psicólogo",
  ENFERMEIRO: "Enfermeiro",
};

function resolveIcon(iconName: string): React.ElementType {
  return ICONS[iconName] ?? LayoutDashboard;
}

export function Sidebar({
  itens,
  user,
  orgConfig,
}: {
  itens: NavItem[];
  user: SidebarUser;
  orgConfig?: OrgConfigView;
}) {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-border bg-card text-card-foreground">
      {/* Logo */}
      <div className="flex h-14 items-center border-b border-border px-4">
        <Link
          href="/dashboard"
          className="rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Logo size="sm" nome={orgConfig?.nomeExibido} logoUrl={orgConfig?.logoUrl} />
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {itens.map((item) => {
            const Icon = resolveIcon(item.icon);
            const active =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User info + sign out */}
      <div className="border-t border-border p-4">
        <div className="mb-3 min-w-0">
          <p className="truncate text-sm font-medium">{user.nome}</p>
          <p className="truncate text-xs text-muted-foreground">
            {CATEGORIA_LABEL[user.categoria ?? ""] ?? user.categoria} ·{" "}
            {user.nomePapel}
          </p>
        </div>
        <button
          type="button"
          onClick={() => signOut({ redirectTo: "/login" })}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <LogOut className="size-4 shrink-0" />
          Sair
        </button>
      </div>
    </aside>
  );
}
