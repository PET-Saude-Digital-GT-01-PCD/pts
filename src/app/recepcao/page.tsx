import { redirect } from "next/navigation";

import { requirePermissao } from "@/server/iam/session";
import { buscarPacientePorDocumento } from "@/server/reception/paciente";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function RecepcaoPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requirePermissao("recepcao.paciente.ver");
  const { q } = await searchParams;

  if (q && q.trim() !== "") {
    const paciente = await buscarPacientePorDocumento(q);
    if (paciente) redirect(`/pacientes/${paciente.id}`);
    redirect(`/recepcao/novo?q=${encodeURIComponent(q.trim())}`);
  }

  return (
    <main className="flex flex-col items-center justify-center gap-8 p-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Recepção</CardTitle>
          <CardDescription>
            Busque o paciente por CPF ou CNS. Não encontrou? Cadastre.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" method="get">
            <div className="grid gap-2">
              <Label htmlFor="q">CPF ou CNS</Label>
              <Input
                id="q"
                name="q"
                inputMode="numeric"
                placeholder="000.000.000-00"
                required
              />
            </div>
            <Button type="submit">Buscar</Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
