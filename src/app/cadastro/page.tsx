import { buscarFormularioCadastro } from "@/server/iam/admissao";
import { CadastroForm } from "./cadastro-form";

export default async function CadastroPage() {
  const formulario = await buscarFormularioCadastro();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      {formulario.disponivel ? (
        <CadastroForm campos={formulario.campos} />
      ) : (
        <p role="alert" className="text-destructive max-w-sm text-center text-sm">
          Auto-cadastro indisponível no momento. Fale com o administrador do
          CER.
        </p>
      )}
    </main>
  );
}
