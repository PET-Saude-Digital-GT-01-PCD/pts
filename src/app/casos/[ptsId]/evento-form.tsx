"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Plus } from "lucide-react";

import { registrarEvento } from "@/server/care-plan/eventos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function EventoForm({
  ptsId,
}: {
  ptsId: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function salvar(formData: FormData) {
    startTransition(async () => {
      const tipo = formData.get("tipo") as string;
      const dataStr = formData.get("data") as string;
      const observacao = formData.get("observacao") as string;

      const r = await registrarEvento({
        ptsId,
        tipo,
        data: dataStr ? new Date(dataStr) : undefined,
        observacao: observacao.trim() || undefined,
      });

      if (r.ok) {
        setAberto(false);
        setMensagem(null);
        router.refresh();
      } else {
        setMensagem(r.erro);
      }
    });
  }

  if (!aberto) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5"
        onClick={() => setAberto(true)}
      >
        <Plus className="h-4 w-4" />
        Registrar evento
      </Button>
    );
  }

  return (
    <div className="rounded-md border p-4">
      <h3 className="mb-4 text-sm font-medium">Novo evento na timeline</h3>
      <form action={salvar} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="tipo">Tipo de evento</Label>
            <select
              id="tipo"
              name="tipo"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              required
            >
              <option value="SESSAO">Sessão / Atendimento</option>
              <option value="FALTA">Falta</option>
              <option value="CANCELAMENTO">Cancelamento</option>
              <option value="OUTRO">Outro</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="data">Data</Label>
            <Input
              id="data"
              name="data"
              type="datetime-local"
              required
              defaultValue={new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="observacao">Observação (opcional)</Label>
          <Input
            id="observacao"
            name="observacao"
            placeholder="Detalhes adicionais..."
            maxLength={500}
          />
        </div>

        {mensagem && (
          <p role="alert" className="text-sm text-destructive">
            {mensagem}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setAberto(false)}
            disabled={pending}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </form>
    </div>
  );
}
