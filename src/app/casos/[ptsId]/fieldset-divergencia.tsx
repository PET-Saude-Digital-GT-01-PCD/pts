import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Divergência saudável (#22): pares [nome do input, rótulo].
export const CAMPOS_RELATO = [
  ["mobilidadeRelatada", "Mobilidade relatada pela família (0–100)"],
  ["expectativaRecuperacao", "Expectativa de recuperação (0–100)"],
  ["autonomiaRelatada", "Autonomia relatada (0–100)"],
] as const;

export const CAMPOS_MEDIDOS = [
  ["mobilidadeMedida", "Mobilidade medida (0–100)"],
  ["prognosticoClinico", "Prognóstico clínico (0–100)"],
  ["autonomiaObservada", "Autonomia observada (0–100)"],
] as const;

export function FieldsetDivergencia() {
  return (
    <fieldset className="grid gap-3 rounded-lg border p-4">
      <legend className="px-1 text-sm font-medium">
        Divergência saudável — relato da família × avaliação clínica (opcional)
      </legend>
      <div className="grid gap-3 sm:grid-cols-3">
        {CAMPOS_RELATO.map(([nome, rotulo]) => (
          <div key={nome} className="grid gap-1">
            <Label htmlFor={nome}>{rotulo}</Label>
            <Input id={nome} name={nome} type="number" min={0} max={100} inputMode="numeric" />
          </div>
        ))}
        {CAMPOS_MEDIDOS.map(([nome, rotulo]) => (
          <div key={nome} className="grid gap-1">
            <Label htmlFor={nome}>{rotulo}</Label>
            <Input id={nome} name={nome} type="number" min={0} max={100} inputMode="numeric" />
          </div>
        ))}
      </div>
    </fieldset>
  );
}
