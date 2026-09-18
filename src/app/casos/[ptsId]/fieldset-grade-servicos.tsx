import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type ItemGrade = { servico: string; frequencia: string; duracao: string; justificativa: string };

export function FieldsetGradeServicos({
  grade,
  onAtualizarItem,
  onAdicionarItem,
  onRemoverItem,
}: {
  grade: ItemGrade[];
  onAtualizarItem: (i: number, campo: keyof ItemGrade, valor: string) => void;
  onAdicionarItem: () => void;
  onRemoverItem: (i: number) => void;
}) {
  return (
    <fieldset className="grid gap-3 rounded-lg border p-4">
      <legend className="px-1 text-sm font-medium">Plano — grade de serviços</legend>
      {grade.map((item, i) => (
        <div key={i} className="grid gap-2 rounded-md border p-3 sm:grid-cols-2">
          <div className="grid gap-1">
            <Label htmlFor={`servico-${i}`}>Serviço</Label>
            <Input
              id={`servico-${i}`}
              value={item.servico}
              onChange={(e) => onAtualizarItem(i, "servico", e.target.value)}
            />
          </div>
          <div className="grid gap-1">
            <Label htmlFor={`frequencia-${i}`}>Frequência</Label>
            <Input
              id={`frequencia-${i}`}
              placeholder="ex.: 2x/semana"
              value={item.frequencia}
              onChange={(e) => onAtualizarItem(i, "frequencia", e.target.value)}
            />
          </div>
          <div className="grid gap-1">
            <Label htmlFor={`duracao-${i}`}>Duração</Label>
            <Input
              id={`duracao-${i}`}
              placeholder="ex.: 12 semanas"
              value={item.duracao}
              onChange={(e) => onAtualizarItem(i, "duracao", e.target.value)}
            />
          </div>
          <div className="grid gap-1">
            <Label htmlFor={`justificativa-${i}`}>Justificativa</Label>
            <Input
              id={`justificativa-${i}`}
              value={item.justificativa}
              onChange={(e) => onAtualizarItem(i, "justificativa", e.target.value)}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            className="justify-self-start"
            onClick={() => onRemoverItem(i)}
            disabled={grade.length === 1}
          >
            Remover item
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" className="justify-self-start" onClick={onAdicionarItem}>
        Adicionar serviço
      </Button>
    </fieldset>
  );
}
