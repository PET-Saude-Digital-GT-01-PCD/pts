import { requirePermissao } from "@/server/iam/session";
import { zaritAlto } from "@/server/reception/zarit";
import { db } from "@/lib/db";
import { EncaminharTriagemBtn } from "./encaminhar-btn";

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
      encaminhadoTriagem: true,
      cuidadores: {
        orderBy: { zaritScore: "desc" },
        take: 1,
        select: { zaritScore: true },
      },
      baseline: {
        select: {
          diagnosticosJson: true,
          alergiasJson: true,
          medicacoesJson: true,
          internacoesJson: true,
          origemJson: true,
        },
      },
      pts: { where: { status: { not: "FECHADO" } }, select: { id: true } },
    },
  });

  if (!paciente) {
    return (
      <main className="flex items-center justify-center p-8">
        <p role="alert" className="text-destructive text-sm">
          Paciente não encontrado.
        </p>
      </main>
    );
  }

  const origens = (paciente.baseline?.origemJson ?? {}) as Record<string, string>;
  const diagnosticos = (paciente.baseline?.diagnosticosJson ?? []) as string[];
  const alergias = (paciente.baseline?.alergiasJson ?? []) as string[];
  const medicacoes = (paciente.baseline?.medicacoesJson ?? []) as Array<{
    nome: string;
    dosagem?: string | null;
  }>;
  const internacoes = (paciente.baseline?.internacoesJson ?? []) as string[];

  return (
    <main className="flex flex-col items-center gap-8 p-8">
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

        {/* Dados pessoais */}
        <dl className="divide-y rounded-md border">
          <Linha rotulo="CPF" valor={paciente.cpf ?? "—"} />
          <Linha rotulo="CNS" valor={paciente.cns ?? "—"} />
          <Linha
            rotulo="Nascimento"
            valor={paciente.dtnasc.toLocaleDateString("pt-BR")}
          />
          <Linha rotulo="Sexo" valor={paciente.sexo} />
        </dl>

        {/* Linha de base */}
        {paciente.baseline && (
          <section className="space-y-3">
            <h2 className="text-lg font-medium">Linha de base</h2>
            <div className="grid gap-3 rounded-md border p-4 text-sm">
              <CampoBaseline
                rotulo="Diagnósticos"
                valores={diagnosticos}
                origem={origens.diagnosticos}
              />
              <CampoBaseline
                rotulo="Alergias"
                valores={alergias}
                origem={origens.alergias}
              />
              <CampoBaseline
                rotulo="Medicações"
                valores={medicacoes.map((m) => m.nome)}
                origem={origens.medicacoes}
              />
              <CampoBaseline
                rotulo="Internações"
                valores={internacoes}
                origem={origens.internacoes}
              />
            </div>
          </section>
        )}

        {/* Ações / Navegação */}
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
          <EncaminharTriagemBtn
            pacienteId={paciente.id}
            nome={paciente.nome}
            jaEncaminhado={paciente.encaminhadoTriagem}
          />
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

function CampoBaseline({
  rotulo,
  valores,
  origem,
}: {
  rotulo: string;
  valores: string[];
  origem?: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="font-medium">{rotulo}</span>
        {origem && (
          <span
            className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
              origem === "importado"
                ? "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {origem === "importado" ? "e-SUS" : "Digitado"}
          </span>
        )}
      </div>
      {valores.length > 0 ? (
        <p className="text-muted-foreground">{valores.join(", ")}</p>
      ) : (
        <p className="text-muted-foreground italic">Não registrado</p>
      )}
    </div>
  );
}
