import Link from "next/link";

import { ShieldAlert, TriangleAlert } from "lucide-react";

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

function paraSemaforo(s: string): SemaforoStatus {
  return s.toLowerCase() as SemaforoStatus;
}

function CardCasoView({ caso }: { caso: CardCaso }) {
  return (
    <Link
      href={`/casos/${caso.ptsId}`}
      className="group block h-full rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <Card className="h-full transition-colors group-hover:border-primary">
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
    return (
      <main className="mx-auto flex max-w-5xl flex-col gap-6 p-4 sm:p-8">
        <header>
          <h1 className="text-2xl font-semibold">Visão geral</h1>
        </header>
        {agregados.total === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
            Nenhum caso aberto no CER ainda.
          </div>
        ) : (
          <section aria-label="Agregados" className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Total de PTS</CardTitle>
              </CardHeader>
              <CardContent className="text-3xl font-semibold">
                {agregados.total}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Por status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                {Object.entries(agregados.porStatus).map(([status, n]) => (
                  <p key={status} className="flex justify-between">
                    <span>{STATUS_LABEL[status] ?? status}</span>
                    <span className="font-medium">{n}</span>
                  </p>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Por semáforo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                {Object.entries(agregados.porSemaforo).map(([s, n]) => (
                  <p key={s} className="flex items-center justify-between">
                    <Semaforo status={paraSemaforo(s)} />
                    <span className="font-medium">{n}</span>
                  </p>
                ))}
              </CardContent>
            </Card>
          </section>
        )}
      </main>
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
          className="space-y-2 rounded-lg border border-warning/40 bg-warning/10 p-4"
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
          className="text-warning w-fit rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm font-medium"
        >
          Fila de espera (Amarelo): {visao.filaAmarela.total} paciente(s) · próxima
          estimativa {visao.filaAmarela.proximaEstimativaDias} dia(s)
        </p>
      ) : null}
      <Grade casos={visao.casos} />
    </main>
  );
}
