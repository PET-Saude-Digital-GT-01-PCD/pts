import { requirePermissao } from "@/server/iam/session";
import { NovoPacienteForm } from "./novo-paciente-form";

// ponytail: seções Cuidador+Consentimento (#19) e Linha de base (#23)
// entram aqui como blocos após o paciente — manter um bloco por seção.
export default async function NovoPacientePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requirePermissao("recepcao.paciente.cadastrar");
  const { q } = await searchParams;

  return (
    <main className="flex flex-col items-center gap-8 p-8">
      <NovoPacienteForm documentoInicial={q ?? ""} />
    </main>
  );
}
