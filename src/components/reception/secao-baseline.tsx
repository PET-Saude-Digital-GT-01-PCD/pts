"use client";

import { useState, useTransition } from "react";

import type { BaselinePaciente } from "@/server/integrations/canonical";
import {
  buscarBaseline,
  salvarBaseline,
} from "@/server/reception/baseline";
import type {
  CamposBaseline,
  OrigensBaseline,
} from "@/server/reception/baseline-campos";
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

// Seção "linha de base" embutida em /recepcao/novo (RF-1.3).
// Campos importados destacados; edição troca a origem para `digitado`.
// Degradação: fonte indisponível → aviso amigável, cadastro nunca trava.

type Estado =
  | { tipo: "inicial" }
  | { tipo: "carregando" }
  | { tipo: "nao_encontrado" }
  | { tipo: "indisponivel" }
  | { tipo: "pronto"; baseline: BaselinePaciente };

const ORIGENS_IMPORTADO = {
  diagnosticos: "importado",
  alergias: "importado",
  medicacoes: "importado",
  internacoes: "importado",
} as const;

function listaParaTexto(lista: string[]): string {
  return lista.join(", ");
}

export function SecaoBaseline({ pacienteId }: { pacienteId: string }) {
  const [identificador, setIdentificador] = useState("");
  const [estado, setEstado] = useState<Estado>({ tipo: "inicial" });
  const [campos, setCampos] = useState<CamposBaseline>({
    diagnosticos: [],
    alergias: [],
    medicacoes: [],
    internacoes: [],
  });
  const [origens, setOrigens] = useState<OrigensBaseline>({
    diagnosticos: "digitado",
    alergias: "digitado",
    medicacoes: "digitado",
    internacoes: "digitado",
  });
  const [salvo, setSalvo] = useState(false);
  const [pendente, iniciarTransicao] = useTransition();

  function importar() {
    if (!identificador.trim()) return;
    setEstado({ tipo: "carregando" });
    setSalvo(false);
    iniciarTransicao(async () => {
      const resultado = await buscarBaseline({ identificador });
      if (resultado.status === "ok") {
        const b = resultado.baseline;
        setCampos({
          diagnosticos: b.diagnosticos,
          alergias: b.alergias,
          medicacoes: b.medicacoes,
          internacoes: b.internacoes,
        });
        setOrigens(ORIGENS_IMPORTADO);
        setEstado({ tipo: "pronto", baseline: b });
        // persiste já com origem por campo (auditoria dentro da action)
        await salvarBaseline({
          pacienteId,
          campos: {
            diagnosticos: b.diagnosticos,
            alergias: b.alergias,
            medicacoes: b.medicacoes,
            internacoes: b.internacoes,
          },
          origens: ORIGENS_IMPORTADO,
        }).catch(() => undefined);
      } else if (resultado.status === "nao_encontrado") {
        setEstado({ tipo: "nao_encontrado" });
      } else {
        setEstado({ tipo: "indisponivel" });
      }
    });
  }

  function editarLista(chave: keyof CamposBaseline, texto: string) {
    setSalvo(false);
    setOrigens((atual) => ({ ...atual, [chave]: "digitado" }));
    if (chave === "medicacoes") {
      setCampos((atual) => ({
        ...atual,
        medicacoes: texto
          .split(",")
          .map((nome) => nome.trim())
          .filter(Boolean)
          .map((nome) => ({ nome, dosagem: null })),
      }));
      return;
    }
    setCampos((atual) => ({
      ...atual,
      [chave]: texto
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    }));
  }

  async function salvarEdicoes() {
    await salvarBaseline({ pacienteId, campos, origens });
    setSalvo(true);
  }

  const destaqueImportado = (chave: keyof OrigensBaseline) =>
    origens[chave] === "importado"
      ? "border-sky-500 bg-sky-50 dark:bg-sky-950/40"
      : "";

  return (
    <Card data-testid="secao-baseline">
      <CardHeader>
        <CardTitle>Linha de base</CardTitle>
        <CardDescription>
          Importe do sistema de saúde ou digite manualmente. O cadastro nunca
          fica bloqueado se o sistema estiver indisponível.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-end gap-2">
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="baseline-identificador">CPF ou CNS do paciente</Label>
            <Input
              id="baseline-identificador"
              value={identificador}
              onChange={(e) => setIdentificador(e.target.value)}
              placeholder="Ex.: 52998224725"
              inputMode="numeric"
            />
          </div>
          <Button
            type="button"
            onClick={importar}
            disabled={pendente || estado.tipo === "carregando"}
          >
            {estado.tipo === "carregando" || pendente ? "Buscando…" : "Importar"}
          </Button>
        </div>

        {estado.tipo === "nao_encontrado" && (
          <p className="text-sm text-muted-foreground" role="status">
            Nenhum registro encontrado para este documento. Continue o
            preenchimento manual.
          </p>
        )}
        {estado.tipo === "indisponivel" && (
          <p className="text-sm text-destructive" role="alert" data-testid="baseline-indisponivel">
            Sistema de saúde temporariamente indisponível. Você pode continuar o
            cadastro digitando os dados — sincronizamos depois.
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bl-diagnosticos">Diagnósticos</Label>
            <Input
              id="bl-diagnosticos"
              value={listaParaTexto(campos.diagnosticos)}
              onChange={(e) => editarLista("diagnosticos", e.target.value)}
              className={destaqueImportado("diagnosticos")}
              placeholder="Separe por vírgula"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bl-alergias">Alergias</Label>
            <Input
              id="bl-alergias"
              value={listaParaTexto(campos.alergias)}
              onChange={(e) => editarLista("alergias", e.target.value)}
              className={destaqueImportado("alergias")}
              placeholder="Separe por vírgula"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bl-medicacoes">Medicações</Label>
            <Input
              id="bl-medicacoes"
              value={listaParaTexto(campos.medicacoes.map((m) => m.nome))}
              onChange={(e) => editarLista("medicacoes", e.target.value)}
              className={destaqueImportado("medicacoes")}
              placeholder="Separe por vírgula"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bl-internacoes">Internações anteriores</Label>
            <Input
              id="bl-internacoes"
              value={listaParaTexto(campos.internacoes)}
              onChange={(e) => editarLista("internacoes", e.target.value)}
              className={destaqueImportado("internacoes")}
              placeholder="Separe por vírgula"
            />
          </div>
        </div>

        {estado.tipo !== "inicial" && estado.tipo !== "carregando" && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-xs">
              {Object.values(origens).some((o) => o === "importado")
                ? "Campos destacados vieram da importação."
                : "Nenhum campo importado."}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={salvarEdicoes}
              disabled={pendente}
            >
              {salvo ? "Linha de base salva" : "Salvar linha de base"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
