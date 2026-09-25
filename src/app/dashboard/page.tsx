import Link from "next/link";

import {
  Activity,
  ClipboardList,
  FileText,
  Layers,
  Radio,
  ShieldAlert,
  ShieldCheck,
  TriangleAlert,
  Users,
  Workflow,
} from "lucide-react";

import { AdminPanel, AdminShell } from "@/components/admin/admin-shell";
import { StatCard } from "@/components/admin/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Semaforo, type SemaforoStatus } from "@/components/ui/semaforo";
import {
  queryCasosPorPapel,
  visaoPorRecursos,
  type CardCaso,
} from "@/server/care-plan/dashboard";
import { recursosDoUsuario, requireAuth } from "@/server/iam/session";
import { listarAlertasRegularizacaoPpi } from "@/server/reception/ppi";

const STATUS_LABEL: Record<string, string> = {
  EM_AVALIACAO: "Em avaliação",
  PACTACAO: "Pactuação",
  SEGUIMENTO: "Seguimento",
  REAVALIACAO: "Reavaliação",
  FECHADO: "Fechado",
};

const ORDEM_STATUS = [
  "EM_AVALIACAO",
  "PACTACAO",
  "SEGUIMENTO",
  "REAVALIACAO",
  "FECHADO",
];

const ATALHOS = [
  {
    href: "/dashboard/fluxo",
    titulo: "Fluxo do cuidado",
    descricao: "Trilha interativa da recepção ao encerramento.",
    icon: Workflow,
    requer: "governanca.dashboard.ver",
  },
  {
    href: "/dashboard/usuarios",
    titulo: "Usuários",
    descricao: "Admissões pendentes, papéis e simulação de perfil.",
    icon: Users,
    requer: "admin.usuarios.ver",
  },
  {
    href: "/dashboard/papeis",
    titulo: "Papéis e permissões",
    descricao: "Matriz de recursos por papel, com guardrails.",
    icon: ShieldCheck,
    requer: "admin.papeis.gerenciar",
  },
  {
    href: "/dashboard/integracoes",
    titulo: "Fila de integrações",
    descricao: "Entregas externas, retries e falhas do gateway.",
    icon: Radio,
    requer: "admin.config.org.editar",
  },
  {
    href: "/dashboard/casos",
    titulo: "Equipes dos casos",
    descricao: "Vincular profissionais sem abrir conteúdo clínico.",
    icon: Layers,
    requer: "care-plan.equipe.gerenciar",
  },
  {
    href: "/governanca",
    titulo: "Indicadores",
    descricao: "North Star e indicadores de saúde do piloto.",
    icon: Activity,
    requer: "governanca.dashboard.ver",
  },
  {
    href: "/governanca/auditoria",
    titulo: "Auditoria",
    descricao: "Trilha append-only das decisões e ajustes.",
    icon: FileText,
    requer: "governanca.auditoria.ver",
  },
];

function paraSemaforo(s: string): SemaforoStatus {
  return s.toLowerCase() as SemaforoStatus;
}

function CardCasoView({ caso }: { caso: CardCaso }) {
  return (
    <Link
      href={`/casos/${caso.ptsId}`}
      className="group block h-full rounded-2xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <Card className="h-full rounded-2xl transition-colors group-hover:ring-primary/40">
        <CardHeader className="gap-2">
          <CardTitle asChild>
            <h2 className="text-base leading-snug">{caso.pacienteNome}</h2>
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">
              {STATUS_LABEL[caso.statusPts] ?? caso.statusPts}
            </Badge>
            <Semaforo status={paraSemaforo(caso.semaforo)} />
          </div>
        </CardHeader>
        {caso.alertas.length > 0 && (
          <CardContent className="space-y-1.5">
            {caso.alertas.map((alerta) => (
              <p
                key={alerta}
                className="flex items-start gap-1.5 text-xs text-warning"
                role="status"
              >
                <TriangleAlert className="mt-px size-3.5 shrink-0" aria-hidden />
                {alerta}
              </p>
            ))}
          </CardContent>
        )}
      </Card>
    </Link>
  );
}

function Grade({ casos }: { casos: CardCaso[] }) {
  if (casos.length === 0) {
    return (
      <EmptyState
        titulo="Sem casos vinculados a você"
        descricao="Assim que você entrar na equipe de um PTS, ele aparece aqui."
      />
    );
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {casos.map((c) => (
        <CardCasoView key={c.ptsId} caso={c} />
      ))}
    </div>
  );
}

export default async function DashboardPage() {
  const user = await requireAuth();
  const recursos = await recursosDoUsuario(user.papelId);
  const visao = visaoPorRecursos(recursos)
    ? await queryCasosPorPapel(user, recursos)
    : null;

  // Sem visão de casos o usuário fica no painel com um aviso: mandá-lo para a
  // página pública criaria um vaivém com o redirecionamento de quem já entrou.
  if (!visao) {
    return (
      <main className="mx-auto flex max-w-3xl flex-col gap-6 p-4 sm:p-8">
        <header>
          <h1 className="text-2xl font-semibold">Painel</h1>
        </header>
        <EmptyState
          icon={ShieldAlert}
          titulo="Sem permissões de acompanhamento"
          descricao="Seu papel ainda não dá acesso a casos ou indicadores. Fale com a administração do CER para ajustar suas permissões."
        />
      </main>
    );
  }

  if (visao.visao === "GESTAO") {
    const { agregados } = visao;
    const atalhos = ATALHOS.filter((a) => recursos.includes(a.requer));
    const ativos = ORDEM_STATUS.filter((s) => s !== "FECHADO")
      .map((s) => agregados.porStatus[s] ?? 0)
      .reduce((a, b) => a + b, 0);
    const atencao =
      (agregados.porSemaforo.VERMELHO ?? 0) + (agregados.porSemaforo.AMARELO ?? 0);

    return (
      <AdminShell
        titulo="Visão geral"
        descricao="Como está o CER agora: volume de PTS, distribuição por etapa e por semáforo."
        largura="larga"
      >
        {agregados.total === 0 ? (
          <EmptyState
            icon={Workflow}
            titulo="Nenhum caso aberto no CER ainda"
            descricao="Assim que a recepção cadastrar o primeiro paciente e a triagem classificar o caso, os números aparecem aqui."
          />
        ) : (
          <>
            <section
              aria-label="Agregados"
              className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
            >
              <StatCard
                rotulo="Total de PTS"
                valor={agregados.total}
                pista="Todos os casos do CER, abertos e encerrados"
                icon={Layers}
                tom="primario"
              />
              <StatCard
                rotulo="Em andamento"
                valor={ativos}
                pista="Da avaliação à reavaliação"
                icon={Workflow}
                tom="neutro"
              />
              <StatCard
                rotulo="Semáforo em atenção"
                valor={atencao}
                pista="Casos classificados como amarelo ou vermelho"
                icon={ClipboardList}
                tom={atencao > 0 ? "alerta" : "sucesso"}
              />
            </section>

            <div className="grid gap-4 lg:grid-cols-2">
              <AdminPanel
                titulo="Por etapa"
                descricao="Distribuição dos PTS na máquina de status."
                acoes={
                  <Link
                    href="/dashboard/fluxo"
                    className="rounded-full px-2 py-1 text-sm font-medium text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    Ver fluxo
                  </Link>
                }
              >
                <ul className="space-y-2.5">
                  {ORDEM_STATUS.map((status) => {
                    const n = agregados.porStatus[status] ?? 0;
                    const pct =
                      agregados.total === 0 ? 0 : (n / agregados.total) * 100;
                    return (
                      <li key={status} className="space-y-1">
                        <p className="flex items-baseline justify-between text-sm">
                          <span>{STATUS_LABEL[status] ?? status}</span>
                          <span className="font-medium tabular-nums">{n}</span>
                        </p>
                        <span
                          className="block h-1.5 w-full overflow-hidden rounded-full bg-surface-sunken"
                          aria-hidden
                        >
                          <span
                            className="block h-full rounded-full bg-primary"
                            style={{ width: `${pct}%` }}
                          />
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </AdminPanel>

              <AdminPanel
                titulo="Por semáforo"
                descricao="Classificação de prioridade vigente nas reuniões."
              >
                <ul className="space-y-2">
                  {Object.entries(agregados.porSemaforo).map(([s, n]) => (
                    <li
                      key={s}
                      className="flex items-center justify-between rounded-2xl bg-surface-sunken px-3 py-2"
                    >
                      <Semaforo status={paraSemaforo(s)} />
                      <span className="font-medium tabular-nums">{n}</span>
                    </li>
                  ))}
                </ul>
              </AdminPanel>
            </div>
          </>
        )}

        {atalhos.length > 0 ? (
          <AdminPanel titulo="Administração">
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {atalhos.map((a) => (
                <li key={a.href}>
                  <Link
                    href={a.href}
                    className="flex h-full items-start gap-3 rounded-2xl bg-surface-sunken p-4 transition-colors outline-none hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <a.icon className="size-4" aria-hidden />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">{a.titulo}</span>
                      <span className="block text-xs text-muted-foreground">
                        {a.descricao}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </AdminPanel>
        ) : null}
      </AdminShell>
    );
  }

  const alertasPpi =
    visao.visao === "RECEPCAO_TRIAGEM" && user.cerId
      ? await listarAlertasRegularizacaoPpi(user.cerId)
      : [];

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 p-4 sm:p-8">
      <header>
        <h1 className="text-2xl font-semibold">
          {visao.visao === "RECEPCAO_TRIAGEM" ? "Fila do dia" : "Meus casos"}
        </h1>
      </header>
      {alertasPpi.length > 0 && (
        <section
          aria-label="Cadastros provisórios pendentes de regularização"
          data-testid="alertas-ppi-dashboard"
          className="space-y-2 rounded-2xl border border-warning/40 bg-warning/10 p-4"
        >
          <h2 className="text-sm font-medium text-warning">
            {alertasPpi.length}{" "}
            {alertasPpi.length === 1
              ? "cadastro provisório precisa"
              : "cadastros provisórios precisam"}{" "}
            de regularização
          </h2>
          <ul className="space-y-1 text-sm">
            {alertasPpi.map((a) => (
              <li key={a.id} className="flex justify-between gap-2">
                <a href={`/pacientes/${a.id}`} className="underline">
                  {a.nome}
                </a>
                <span className={a.diasRestantes < 0 ? "text-destructive" : "text-warning"}>
                  {a.diasRestantes < 0
                    ? `vencido há ${Math.abs(a.diasRestantes)}d`
                    : `${a.diasRestantes}d restantes`}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
      {visao.visao === "RECEPCAO_TRIAGEM" && visao.filaAmarela.total > 0 ? (
        <p
          role="status"
          data-testid="fila-amarela-resumo"
          className="text-warning w-fit rounded-full border border-warning/40 bg-warning/10 px-3 py-2 text-sm font-medium"
        >
          Fila de espera (Amarelo): {visao.filaAmarela.total} paciente(s) · próxima
          estimativa {visao.filaAmarela.proximaEstimativaDias} dia(s)
        </p>
      ) : null}
      <Grade casos={visao.casos} />
    </main>
  );
}
