"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import type { ItemAdmin } from "@/server/iam/admin-nav";

/** Mais específico vence: /governanca/auditoria não acende a aba /governanca. */
function chaveAtiva(itens: ItemAdmin[], pathname: string): string | null {
  const candidatos = itens.filter(
    (i) => pathname === i.href || pathname.startsWith(`${i.href}/`),
  );
  if (candidatos.length === 0) return null;
  return candidatos.reduce((a, b) => (b.href.length > a.href.length ? b : a))
    .chave;
}

export function AdminNav({ itens }: { itens: ItemAdmin[] }) {
  const pathname = usePathname();
  const ativa = chaveAtiva(itens, pathname);

  return (
    <nav aria-label="Áreas do painel administrativo" className="-mx-1 overflow-x-auto px-1 pb-1">
      <ul className="flex w-max min-w-full items-center gap-1 rounded-full bg-surface-sunken p-1">
        {itens.map((item) => {
          const ativo = item.chave === ativa;
          return (
            <li key={item.chave}>
              <Link
                href={item.href}
                aria-current={ativo ? "page" : undefined}
                className={cn(
                  "block rounded-full px-3.5 py-1.5 text-sm font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                  ativo
                    ? "bg-surface-raised text-primary shadow-soft"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
