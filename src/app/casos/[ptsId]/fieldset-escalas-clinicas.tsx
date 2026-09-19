import { Label } from "@/components/ui/label";
import { campoNativoClasses } from "@/lib/utils";
import {
  GRUPOS_ASHWORTH,
  calcularAshworth,
  somaGlasgow,
  type GrupoAshworth,
  type ValoresAshworth,
  type ValoresGlasgow,
} from "@/server/clinical/escalas";

const ROTULOS_ASHWORTH: Record<GrupoAshworth, string> = {
  cotoveloFlexores: "Cotovelo — flexores",
  cotoveloExtensores: "Cotovelo — extensores",
  punhoFlexores: "Punho — flexores",
  joelhoFlexores: "Joelho — flexores",
  joelhoExtensores: "Joelho — extensores",
  tornozeloFlexoresPlantares: "Tornozelo — flexores plantares",
};

export function FieldsetEscalasClinicas({
  ashworth,
  glasgow,
  onAtualizarAshworth,
  onAtualizarGlasgow,
}: {
  ashworth: ValoresAshworth;
  glasgow: ValoresGlasgow;
  onAtualizarAshworth: (grupo: GrupoAshworth, valor: string) => void;
  onAtualizarGlasgow: (campo: keyof ValoresGlasgow, valor: string) => void;
}) {
  const scoreAshworth = calcularAshworth(ashworth);
  const scoreGlasgow = somaGlasgow(glasgow);

  return (
    <fieldset className="grid gap-4 rounded-lg border p-4">
      <legend className="px-1 text-sm font-medium">
        Objetivo — escalas clínicas (opcional)
      </legend>

      <div className="grid gap-2">
        <p className="text-xs font-medium text-muted-foreground">
          Ashworth Modificada (0–4 por grupo muscular)
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          {GRUPOS_ASHWORTH.map((grupo) => (
            <div key={grupo} className="grid gap-1">
              <Label htmlFor={`ashworth-${grupo}`}>{ROTULOS_ASHWORTH[grupo]}</Label>
              <select
                id={`ashworth-${grupo}`}
                value={ashworth[grupo] ?? ""}
                onChange={(e) => onAtualizarAshworth(grupo, e.target.value)}
                className={campoNativoClasses}
              >
                <option value="">Não avaliado</option>
                {[0, 1, 2, 3, 4].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
        <p data-testid="ashworth-total" className="text-sm text-muted-foreground">
          Total: {scoreAshworth.total} · Média:{" "}
          {scoreAshworth.media === null ? "—" : scoreAshworth.media.toFixed(1)} ·{" "}
          {scoreAshworth.gruposAvaliados} grupo(s) avaliado(s)
        </p>
      </div>

      <div className="grid gap-2">
        <p className="text-xs font-medium text-muted-foreground">Escala de Coma de Glasgow</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="grid gap-1">
            <Label htmlFor="glasgow-ocular">Abertura ocular (1–4)</Label>
            <select
              id="glasgow-ocular"
              value={glasgow.ocular ?? ""}
              onChange={(e) => onAtualizarGlasgow("ocular", e.target.value)}
              className={campoNativoClasses}
            >
              <option value="">—</option>
              {[1, 2, 3, 4].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-1">
            <Label htmlFor="glasgow-verbal">Resposta verbal (1–5)</Label>
            <select
              id="glasgow-verbal"
              value={glasgow.verbal ?? ""}
              onChange={(e) => onAtualizarGlasgow("verbal", e.target.value)}
              className={campoNativoClasses}
            >
              <option value="">—</option>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-1">
            <Label htmlFor="glasgow-motor">Resposta motora (1–6)</Label>
            <select
              id="glasgow-motor"
              value={glasgow.motor ?? ""}
              onChange={(e) => onAtualizarGlasgow("motor", e.target.value)}
              className={campoNativoClasses}
            >
              <option value="">—</option>
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>
        <p data-testid="glasgow-total" className="text-sm text-muted-foreground">
          Total:{" "}
          {scoreGlasgow.completo
            ? scoreGlasgow.total
            : "preencha os 3 campos para calcular"}
        </p>
      </div>
    </fieldset>
  );
}
