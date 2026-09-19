import Link from "next/link";

import { KeyRound, ShieldCheck, Users } from "lucide-react";

import { AdminPanel, AdminShell } from "@/components/admin/admin-shell";
import { StatCard } from "@/components/admin/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { requirePermissao } from "@/server/iam/session";
import { CriarPapelForm } from "./criar-papel-form";

const BASE_VARIANT: Record<string, "secondary" | "warning" | "destructive"> = {
  CLINICO: "secondary",
  GESTOR: "warning",
  ADMIN: "destructive",
};

export default async function PapeisPage() {
  const user = await requirePermissao("admin.papeis.gerenciar");

  const [papeis, recursos] = await Promise.all([
    db.papel.findMany({
      where: { cerId: user.cerId ?? undefined },
      orderBy: { nome: "asc" },
      include: {
        _count: { select: { usuarios: true } },
        recursos: { select: { recurso: { select: { chave: true } } } },
      },
    }),
    db.recurso.findMany({ orderBy: [{ grupo: "asc" }, { chave: "asc" }] }),
  ]);

  const ativos = papeis.filter((p) => p.ativo).length;

  return (
    <AdminShell
      titulo="Papéis e permissões"
      descricao="O acesso é data-driven: cada papel carrega um conjunto de recursos, e toda mudança grava auditoria."
      largura="larga"
      acoes={
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard/usuarios">Ver usuários</Link>
        </Button>
      }
    >
      <section
        aria-label="Resumo de papéis"
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
      >
        <StatCard
          rotulo="Papéis ativos"
          valor={ativos}
          pista={`${papeis.length} no total, incluindo inativos`}
          icon={ShieldCheck}
          tom="primario"
        />
        <StatCard
          rotulo="Recursos no catálogo"
          valor={recursos.length}
          pista="Chaves RBAC disponíveis para combinar"
          icon={KeyRound}
          tom="neutro"
        />
        <StatCard
          rotulo="Usuários com papel"
          valor={papeis.reduce((acc, p) => acc + p._count.usuarios, 0)}
          pista="Somando todos os papéis do CER"
          icon={Users}
          tom="neutro"
        />
      </section>

      <AdminPanel
        titulo="Papéis do CER"
        descricao="Abra um papel para revisar nome, base e permissões. Papel em uso não pode ser apagado."
      >
        <ul className="grid gap-3 sm:grid-cols-2">
          {papeis.map((p) => (
            <li key={p.id}>
              <Link
                href={`/dashboard/papeis/${p.id}`}
                className="flex h-full flex-col gap-2 rounded-2xl bg-surface-sunken p-4 transition-colors outline-none hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{p.nome}</span>
                  <Badge variant={BASE_VARIANT[p.base] ?? "secondary"}>
                    {p.base}
                  </Badge>
                  {!p.ativo ? <Badge variant="outline">inativo</Badge> : null}
                </span>
                {p.descricao ? (
                  <span className="text-xs text-muted-foreground">
                    {p.descricao}
                  </span>
                ) : null}
                <span className="mt-auto text-xs text-muted-foreground tabular-nums">
                  {p.recursos.length} recursos · {p._count.usuarios} usuários
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </AdminPanel>

      <AdminPanel
        titulo="Criar papel"
        descricao="Base GESTOR não pode receber recurso clínico; recursos de admin são restritos à base ADMIN. Os guardrails são validados no salvamento."
      >
        <CriarPapelForm
          recursos={recursos.map((r) => ({
            chave: r.chave,
            grupo: r.grupo,
            descricao: r.descricao,
          }))}
        />
      </AdminPanel>
    </AdminShell>
  );
}
