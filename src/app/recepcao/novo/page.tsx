import type { Metadata } from "next";
import { requirePermissao } from "@/server/iam/session";
import { NovoPacienteForm } from "./novo-paciente-form";


export const metadata: Metadata = {
  title: "Nova Recepção — PTS Digital",
  description: "Cadastro de paciente com importação de linha de base clínica do e-SUS.",
};

// ponytail: seções Cuidador+Consentimento (#19) e Linha de base (#23)
// entram aqui como blocos após o paciente — manter um bloco por seção.
export default async function NovoPacientePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string, pacienteId?: string }>;
}) {
  await requirePermissao("recepcao.paciente.cadastrar");
  const { q } = await searchParams;

  return (
    <main className="mx-auto max-w-3xl flex flex-col gap-8 p-8">
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Recepção
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">Nova Recepção</h1>
      </div>

      <NovoPacienteForm documentoInicial={q ?? ""} />

    </main>
  );
}
