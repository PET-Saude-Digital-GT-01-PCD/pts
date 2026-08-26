import { requirePermissao } from "@/server/iam/session";
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
      nome: true,
      cpf: true,
      cns: true,
      dtnasc: true,
      sexo: true,
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
