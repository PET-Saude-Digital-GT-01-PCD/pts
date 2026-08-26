import { requirePermissao } from "@/server/iam/session";
import { zaritAlto } from "@/server/reception/zarit";
import { TriagemForm } from "@/app/casos/[ptsId]/triagem-form";
import { db } from "@/lib/db";

export default async function PacientePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermissao("recepcao.paciente.ver");
  const { id } = await params;

  const paciente = await db.paciente.findUnique({
    where: { id },
    select: {
      id: true,
      nome: true,
      cpf: true,
      cns: true,
      dtnasc: true,
      sexo: true,
      cuidadores: {
        orderBy: { zaritScore: "desc" },
        take: 1,
        select: { zaritScore: true },
      },
      pts: { where: { status: { not: "FECHADO" } }, select: { id: true } },
    },
  });

  if (!paciente) {
    return (
      <main className="flex min-h-screen items-center justify-center p-8">
        <p role="alert" className="text-destructive text-sm">
          Paciente não encontrado.
        </p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center gap-8 p-8">
      <div className="w-full max-w-lg space-y-4">
        <h1 className="text-2xl font-semibold">{paciente.nome}</h1>
        {zaritAlto(paciente.cuidadores[0]?.zaritScore) ? (
          <p
            role="alert"
            className="text-destructive rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm font-medium"
          >
            Cuidador com Zarit alto — encaminhar ao Serviço Social.
          </p>
        ) : null}
        <dl className="divide-y rounded-md border">
          <Linha rotulo="CPF" valor={paciente.cpf ?? "—"} />
          <Linha rotulo="CNS" valor={paciente.cns ?? "—"} />
          <Linha
            rotulo="Nascimento"
            valor={paciente.dtnasc.toLocaleDateString("pt-BR")}
          />
          <Linha rotulo="Sexo" valor={paciente.sexo} />
        </dl>
        {/* ponytail: seções Cuidador/Consentimento (#19) e PTS (#18) entram aqui */}
        {paciente.pts.length > 0 ? (
          <p className="text-sm text-muted-foreground">
            Caso em andamento:{" "}
            <a
              className="underline"
              href={`/casos/${paciente.pts[0].id}?aba=triagem`}
            >
              abrir painel do caso
            </a>
          </p>
        ) : (
          <section className="space-y-3">
            <h2 className="text-lg font-medium">Triagem</h2>
            <TriagemForm pacienteId={paciente.id} />
          </section>
        )}
      </div>
    </main>
  );
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex justify-between px-4 py-2 text-sm">
      <dt className="text-muted-foreground">{rotulo}</dt>
      <dd>{valor}</dd>
    </div>
  );
}
