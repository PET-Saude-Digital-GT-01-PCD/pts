import { AdminPanel, AdminShell } from "@/components/admin/admin-shell";
import { StatCard } from "@/components/admin/stat-card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { db } from "@/lib/db";
import { requirePermissao } from "@/server/iam/session";
import { ReprocessarEventoButton } from "./reprocessar-evento-button";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Aguardando",
  PROCESSING: "Processando",
  SENT: "Enviado ao gateway",
  FAILED: "Falha definitiva",
};

const STATUS_VARIANT: Record<
  string,
  "secondary" | "warning" | "success" | "destructive"
> = {
  PENDING: "secondary",
  PROCESSING: "warning",
  SENT: "success",
  FAILED: "destructive",
};

function dataHora(data: Date | null) {
  return data
    ? data.toLocaleString("pt-BR", { timeZone: "America/Recife" })
    : "—";
}

export default async function IntegracoesPage() {
  await requirePermissao("admin.config.org.editar");
  const [contagens, falhasRecentes, eventosRecentes] = await Promise.all([
    db.outboundEvent.groupBy({ by: ["status"], _count: { _all: true } }),
    db.outboundEvent.findMany({
      where: { status: "FAILED" },
      orderBy: { processadoEm: "desc" },
      take: 100,
      select: {
        id: true,
        tipo: true,
        status: true,
        attempts: true,
        lastError: true,
        nextRetryAt: true,
        lockedUntil: true,
        criadoEm: true,
        processadoEm: true,
      },
    }),
    db.outboundEvent.findMany({
      where: { status: { not: "FAILED" } },
      orderBy: { criadoEm: "desc" },
      take: 100,
      select: {
        id: true,
        tipo: true,
        status: true,
        attempts: true,
        lastError: true,
        nextRetryAt: true,
        lockedUntil: true,
        criadoEm: true,
        processadoEm: true,
      },
    }),
  ]);
  const eventos = [...falhasRecentes, ...eventosRecentes];
  const totalPorStatus = Object.fromEntries(
    contagens.map(({ status, _count }) => [status, _count._all]),
  );
  const falhas = totalPorStatus.FAILED ?? 0;

  return (
    <AdminShell
      titulo="Fila de integrações"
      descricao="Acompanhe entregas externas, novas tentativas e falhas definitivas."
      largura="larga"
    >
      <section
        aria-label="Resumo da fila de integrações"
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
      >
        <StatCard
          rotulo="Aguardando"
          valor={totalPorStatus.PENDING ?? 0}
          pista="Inclui eventos aguardando retry"
        />
        <StatCard
          rotulo="Processando"
          valor={totalPorStatus.PROCESSING ?? 0}
          pista="Reservados pelo worker"
        />
        <StatCard
          rotulo="Enviados"
          valor={totalPorStatus.SENT ?? 0}
          pista="Aceitos pelo gateway configurado"
        />
        <StatCard
          rotulo="Falhas definitivas"
          valor={falhas}
          pista="Esgotaram as tentativas automáticas"
          tom={falhas ? "alerta" : "neutro"}
        />
      </section>

      {falhas > 0 ? (
        <AdminPanel
          titulo={`Falhas que precisam de atenção (${falhas})`}
          descricao={`O worker tenta até cinco vezes com espera crescente. Depois disso, o evento fica aqui até o reprocessamento manual. Exibindo até ${falhasRecentes.length} falhas recentes.`}
          className="ring-warning/30"
        >
          <p className="text-sm text-muted-foreground">
            Corrija primeiro a indisponibilidade no gateway. O reprocessamento
            mantém a mesma chave idempotente para evitar duplicatas no destino.
          </p>
        </AdminPanel>
      ) : null}

      <AdminPanel
        titulo="Eventos recentes"
        descricao="Até 100 eventos mais recentes. O conteúdo do payload é ocultado nesta tela por poder conter dados pessoais."
      >
        {eventos.length === 0 ? (
          <p className="rounded-xl bg-surface-sunken p-6 text-sm text-muted-foreground">
            Nenhum evento foi enfileirado.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Evento</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Tentativas</TableHead>
                <TableHead>Próxima ação / conclusão</TableHead>
                <TableHead>Erro</TableHead>
                <TableHead>
                  <span className="sr-only">Ações</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {eventos.map((evento) => (
                <TableRow key={evento.id}>
                  <TableCell>
                    <span className="font-medium">{evento.tipo}</span>
                    <span className="block text-xs text-muted-foreground">
                      {evento.id.slice(0, 8)} · criado {dataHora(evento.criadoEm)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[evento.status]}>
                      {STATUS_LABEL[evento.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>{evento.attempts}</TableCell>
                  <TableCell>
                    {dataHora(
                      evento.nextRetryAt ??
                        evento.lockedUntil ??
                        evento.processadoEm ??
                        evento.criadoEm,
                    )}
                  </TableCell>
                  <TableCell className="max-w-xs whitespace-normal text-xs text-destructive">
                    {evento.lastError ?? "—"}
                  </TableCell>
                  <TableCell>
                    {evento.status === "FAILED" ? (
                      <ReprocessarEventoButton eventoId={evento.id} />
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </AdminPanel>
    </AdminShell>
  );
}
