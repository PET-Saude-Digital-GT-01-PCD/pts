import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CamposBaseline, OrigensBaseline } from "@/server/reception/baseline-campos";

function listaParaTexto(lista: string[]): string {
  return lista.join(", ");
}

export function SecaoLinhaBase({
  campos,
  origens,
  onEditarLista,
}: {
  campos: CamposBaseline;
  origens: OrigensBaseline;
  onEditarLista: (chave: keyof CamposBaseline, texto: string) => void;
}) {
  const destaqueImportado = (chave: keyof OrigensBaseline) =>
    origens[chave] === "importado"
      ? "border-sky-500 bg-sky-50 dark:bg-sky-950/40"
      : "";

  return (
    <div className="grid gap-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-semibold">Linha de Base Clínica</h3>
        <span className="text-xs text-muted-foreground">
          Opcional. Os campos destacados vieram da importação.
        </span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="bl-diagnosticos">Diagnósticos</Label>
          <Input
            id="bl-diagnosticos"
            value={listaParaTexto(campos.diagnosticos)}
            onChange={(e) => onEditarLista("diagnosticos", e.target.value)}
            className={destaqueImportado("diagnosticos")}
            placeholder="Separe por vírgula"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="bl-alergias">Alergias</Label>
          <Input
            id="bl-alergias"
            value={listaParaTexto(campos.alergias)}
            onChange={(e) => onEditarLista("alergias", e.target.value)}
            className={destaqueImportado("alergias")}
            placeholder="Separe por vírgula"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="bl-medicacoes">Medicações</Label>
          <Input
            id="bl-medicacoes"
            value={listaParaTexto(campos.medicacoes.map((m) => m.nome))}
            onChange={(e) => onEditarLista("medicacoes", e.target.value)}
            className={destaqueImportado("medicacoes")}
            placeholder="Separe por vírgula"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="bl-internacoes">Internações anteriores</Label>
          <Input
            id="bl-internacoes"
            value={listaParaTexto(campos.internacoes)}
            onChange={(e) => onEditarLista("internacoes", e.target.value)}
            className={destaqueImportado("internacoes")}
            placeholder="Separe por vírgula"
          />
        </div>
      </div>
    </div>
  );
}
