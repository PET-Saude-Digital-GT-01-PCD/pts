import Link from "next/link";
import { FileQuestion } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function NaoEncontrado() {
  return (
    <main className="mx-auto w-full max-w-4xl p-4 sm:p-8">
      <EmptyState
        icon={FileQuestion}
        titulo="Caso não encontrado"
        descricao="O PTS não existe ou foi removido. Confira o link ou volte para a lista de casos."
        acao={
          <Button asChild>
            <Link href="/dashboard">Ir para o painel</Link>
          </Button>
        }
      />
    </main>
  );
}
