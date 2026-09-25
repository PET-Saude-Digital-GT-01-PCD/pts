"use client";

import Link from "next/link";
import { useState } from "react";
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
  Workflow,
  Menu,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { Logo } from "@/components/ui/logo";
import { cn } from "@/lib/utils";
import type { OrgConfigView } from "@/server/iam/org-config-schema";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

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
  Workflow,
  CalendarDays,
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

function ConteudoSidebar({
  itens,
  user,
  orgConfig,
  pathname,
  aoNavegar,
}: {
  itens: NavItem[];
  user: SidebarUser;
  orgConfig?: OrgConfigView;
  pathname: string;
  aoNavegar?: () => void;
}) {
  return (
    <>
      <div className="flex h-14 items-center border-b border-border px-4">
        <Link
          href="/dashboard"
          onClick={aoNavegar}
          className="rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Logo size="sm" nome={orgConfig?.nomeExibido} logoUrl={orgConfig?.logoUrl} />
        </Link>
      </div>

      <nav aria-label="Menu principal" className="flex-1 overflow-y-auto px-3 py-4">
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
                  onClick={aoNavegar}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-full px-3 py-2 text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <Icon className="size-4 shrink-0" aria-hidden />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="space-y-3 border-t border-border p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{user.nome}</p>
            <p className="truncate text-xs text-muted-foreground">
              {CATEGORIA_LABEL[user.categoria ?? ""] ?? user.categoria} ·{" "}
              {user.nomePapel}
            </p>
          </div>
          <ThemeToggle />
        </div>
        <Button
          type="button"
          variant="ghost"
          onClick={() => signOut({ redirectTo: "/login" })}
          className="w-full justify-start gap-3 px-3 text-muted-foreground"
        >
          <LogOut className="size-4 shrink-0" aria-hidden />
          Sair
        </Button>
      </div>
    </>
  );
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
  const [aberto, setAberto] = useState(false);
  const [retractado, setRetractado] = useState(false);

  return (
    <>
      {/* Barra do mobile: a lateral fixa espremia o conteúdo em telas estreitas. */}
      <div className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-card px-4 lg:hidden">
        <Dialog open={aberto} onOpenChange={setAberto}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Abrir menu">
              <Menu className="size-5" aria-hidden />
            </Button>
          </DialogTrigger>
          <DialogContent
            showCloseButton={false}
            className="top-0 left-0 grid h-dvh max-h-dvh w-72 max-w-[85vw] translate-none grid-rows-[auto_1fr_auto] gap-0 rounded-none bg-card p-0 text-card-foreground data-open:zoom-in-100 data-closed:zoom-out-100"
          >
            <DialogTitle className="sr-only">Menu principal</DialogTitle>
            <ConteudoSidebar
              itens={itens}
              user={user}
              orgConfig={orgConfig}
              pathname={pathname}
              aoNavegar={() => setAberto(false)}
            />
          </DialogContent>
        </Dialog>
        <Link
          href="/dashboard"
          className="rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <Logo size="sm" nome={orgConfig?.nomeExibido} logoUrl={orgConfig?.logoUrl} />
        </Link>
        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </div>

      <aside 
  className="hidden h-screen flex-col border-r border-border bg-card text-card-foreground lg:flex w-64 transition-width"
  style={{ width: retractado ? '5rem' : '16rem' }}
>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setRetractado(!retractado)}
          aria-label={retractado ? "Expandir sidebar" : "Retrair sidebar"}
        >
          {retractado ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
        </Button>
        <ConteudoSidebar
          itens={itens}
          user={user}
          orgConfig={orgConfig}
          pathname={pathname}
        />
      </aside>
    </>
  );
}
