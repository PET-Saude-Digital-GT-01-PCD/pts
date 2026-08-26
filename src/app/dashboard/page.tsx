import Link from "next/link";
import { redirect } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Semaforo, type SemaforoStatus } from "@/components/ui/semaforo";
import {
  queryCasosPorPapel,
  visaoPorRecursos,
  type CardCaso,
} from "@/server/care-plan/dashboard";
import { recursosDoUsuario, requireAuth } from "@/server/iam/session";
import { SignOutButton } from "./sign-out-button";

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
    <Link href={`/casos/${caso.ptsId}`} className="block">
      <Card className="transition-colors hover:border-primary">
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-2">
            <span className="truncate">{caso.pacienteNome}</span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {STATUS_LABEL[caso.statusPts] ?? caso.statusPts}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Semaforo status={paraSemaforo(caso.semaforo)} label="Reunião" />
          {caso.alertas.map((alerta) => (
            <p
              key={alerta}
              className="rounded-md bg-warning/15 px-2 py-1 text-xs text-warning"
              role="status"
            >
              {alerta}
            </p>
          ))}
        </CardContent>
      </Card>
    </Link>
  );
}

function Grade({ casos }: { casos: CardCaso[] }) {
  if (casos.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        Sem casos vinculados a você por enquanto.
      </div>
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
  if (!visaoPorRecursos(recursos)) redirect("/");
  const visao = await queryCasosPorPapel(user, recursos);
  if (!visao) redirect("/");

  if (visao.visao === "GESTAO") {
    const { agregados } = visao;
    return (
      <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 p-8">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Visão geral</h1>
          <SignOutButton />
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

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 p-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Meus casos</h1>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span>{user.nome}</span>
          <SignOutButton />
        </div>
      </header>
      <Grade casos={visao.casos} />
    </main>
  );
}
