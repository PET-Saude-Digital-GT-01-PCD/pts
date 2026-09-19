import Link from "next/link";

import { UserCheck, Users } from "lucide-react";

import { AdminPanel, AdminShell } from "@/components/admin/admin-shell";
import { StatCard } from "@/components/admin/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { db } from "@/lib/db";
import { recursosDoUsuario, requirePermissao } from "@/server/iam/session";
import { listarPendentes } from "@/server/iam/admissao";
import { AtribuirPapelForm } from "./atribuir-papel-form";
import { AprovacaoForm } from "./aprovacao-form";
import { SimularPerfilBtn } from "./simular-perfil-btn";
import { podeImpersonar } from "@/server/iam/permissoes";

const STATUS_VARIANT: Record<string, "success" | "warning" | "destructive"> = {
  ATIVO: "success",
  PENDENTE: "warning",
  BLOQUEADO: "destructive",
};

export default async function UsuariosPage() {
  const user = await requirePermissao("admin.usuarios.ver");
  const recursos = await recursosDoUsuario(user.papelId);
  const podeAtribuirPapel = recursos.includes("admin.papeis.gerenciar");
  const podeAprovar = recursos.includes("admin.usuarios.aprovar");
  const podeSimular = recursos.includes("admin.usuarios.impersonar");

  const [usuarios, papeis, pendentes] = await Promise.all([
    db.usuario.findMany({
      where: { cerId: user.cerId ?? undefined, status: { not: "PENDENTE" } },
      orderBy: { nome: "asc" },
      select: {
        id: true,
        nome: true,
        email: true,
        status: true,
        papelId: true,
        papel: { select: { base: true } },
      },
    }),
    db.papel.findMany({
      where: { cerId: user.cerId ?? undefined, ativo: true },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true },
    }),
    podeAprovar ? listarPendentes() : Promise.resolve([]),
  ]);

  const ativos = usuarios.filter((u) => u.status === "ATIVO").length;

  return (
    <AdminShell
      titulo="Usuários"
      descricao="Quem entra na plataforma e com qual papel. A admissão é revisada antes de o acesso valer."
      largura="larga"
      acoes={
        podeAtribuirPapel ? (
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/papeis">Gerenciar papéis</Link>
          </Button>
        ) : null
      }
    >
      <section
        aria-label="Resumo de usuários"
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
      >
        <StatCard
          rotulo="Usuários ativos"
          valor={ativos}
          pista="Com acesso liberado ao CER"
          icon={Users}
          tom="primario"
        />
        <StatCard
          rotulo="Aguardando aprovação"
          valor={pendentes.length}
          pista="Auto-cadastros pendentes de revisão"
          icon={UserCheck}
          tom={pendentes.length > 0 ? "alerta" : "neutro"}
        />
        <StatCard
          rotulo="Papéis disponíveis"
          valor={papeis.length}
          pista="Papéis ativos para atribuição"
          icon={Users}
          tom="neutro"
        />
      </section>

      {podeAprovar && pendentes.length > 0 ? (
        <AdminPanel
          titulo={`Pendentes de aprovação (${pendentes.length})`}
          descricao="Aprovar dá o papel AUTOCADASTRO, sem recursos: atribua o papel profissional logo em seguida."
          data-testid="fila-pendentes"
          className="ring-warning/30"
        >
          <div className="divide-y divide-border overflow-hidden rounded-2xl bg-surface-sunken">
            {pendentes.map((p) => (
              <AprovacaoForm key={p.id} usuario={p} />
            ))}
          </div>
        </AdminPanel>
      ) : null}

      <AdminPanel
        titulo="Usuários ativos"
        descricao={
          podeAtribuirPapel
            ? "Trocar o papel de alguém vale no próximo carregamento da sessão e fica registrado na auditoria."
            : undefined
        }
      >
        {usuarios.length === 0 ? (
          <EmptyState
            icon={Users}
            titulo="Nenhum usuário ativo"
            descricao="Os cadastros aprovados aparecem aqui."
          />
        ) : (
          <div className="overflow-hidden rounded-2xl ring-1 ring-foreground/5">
            <Table>
              <TableHeader>
                <TableRow className="bg-surface-sunken hover:bg-surface-sunken">
                  <TableHead className="pl-4">Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Papel</TableHead>
                  {podeSimular ? <TableHead className="pr-4">Ações</TableHead> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {usuarios.map((u) => (
                  <TableRow key={u.id} data-email={u.email}>
                    <TableCell className="pl-4 font-medium">{u.nome}</TableCell>
                    <TableCell className="text-muted-foreground">{u.email}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[u.status] ?? "secondary"}>
                        {u.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-normal">
                      {podeAtribuirPapel ? (
                        <AtribuirPapelForm usuario={u} papeis={papeis} />
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          {papeis.find((p) => p.id === u.papelId)?.nome ?? "—"}
                        </span>
                      )}
                    </TableCell>
                    {podeSimular ? (
                      <TableCell className="pr-4">
                        {podeImpersonar(user.id, {
                          id: u.id,
                          basePapel: u.papel.base,
                          status: u.status,
                        }).ok ? (
                          <SimularPerfilBtn usuarioId={u.id} />
                        ) : null}
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </AdminPanel>
    </AdminShell>
  );
}
