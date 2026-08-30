import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { CadastroForm } from "./cadastro-form";

// CER padrão: usa variável de ambiente ou o único CER do banco.
async function resolverCer(): Promise<string | null> {
  const cerIdEnv = process.env.NEXT_PUBLIC_CER_ID;
  if (cerIdEnv) return cerIdEnv;

  const cer = await db.cer.findFirst({ select: { id: true } });
  return cer?.id ?? null;
}

export default async function CadastroPage() {
  const session = await auth();
  if (session?.user?.papelId) redirect("/dashboard");

  const cerId = await resolverCer();
  if (!cerId) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-8">
        <p className="text-destructive">
          Nenhum CER configurado. Contate o administrador do sistema.
        </p>
      </main>
    );
  }

  const campos = await db.formularioConfig.findMany({
    where: { cerId, entidade: "usuario", visivel: true },
    orderBy: { ordem: "asc" },
  });

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <CadastroForm cerId={cerId} campos={campos} />
    </main>
  );
}
