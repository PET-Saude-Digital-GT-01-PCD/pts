"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { criarTriagem } from "@/server/triage/registrar";
import { GuiaContrarreferenciaForm } from "@/components/guia-contrarreferencia-form";
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

const FUNCIONAL_LABELS = [
  "Mobilidade",
  "Autocuidado",
  "Comunicação",
  "Vida diária/social",
] as const;

export function TriagemForm({
  pacienteId,
  ptsId,
  versao,
}: {
  pacienteId?: string;
  ptsId?: string;
  versao?: number;
}) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [naoElegivel, setNaoElegivel] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro(null);
    setNaoElegivel(null);
    setPending(true);

    const form = new FormData(event.currentTarget);
    const funcional = FUNCIONAL_LABELS.map((_, i) =>
      Number(form.get(`funcional-${i}`)),
    );

    let resultado;
    try {
      resultado = await criarTriagem({
        ...(pacienteId ? { pacienteId } : {}),
        ...(ptsId ? { ptsId, version: versao } : {}),
        cid: form.get("cid"),
        motivo: form.get("motivo"),
        justificativa: form.get("justificativa") || undefined,
        eixos: {
          bandeiras: {
            motivoAgudo: form.get("motivoAgudo") === "on",
            altaHospitalarRecente: form.get("altaHospitalarRecente") === "on",
            posCirurgico: form.get("posCirurgico") === "on",
          },
          funcional: [
            funcional[0],
            funcional[1],
            funcional[2],
            funcional[3],
          ] as [number, number, number, number],
          social: {
            cuidadorPresente: form.get("cuidadorPresente") === "on",
            zaritScore: Number(form.get("zaritScore") || 0),
            vulnerabilidades: Number(form.get("vulnerabilidades") || 0),
          },
        },
      });
    } catch {
      setErro("Falha inesperada no servidor ao registrar triagem.");
      setPending(false);
      return;
    }

    if (!resultado.ok) {
      if ("codigo" in resultado && resultado.codigo === "NAO_ELEGIVEL") {
        setNaoElegivel(resultado.justificativa);
      } else {
        setErro(resultado.erro);
      }
      setPending(false);
      return;
    }

    router.push(`/casos/${resultado.ptsId}?aba=triagem`);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{ptsId ? "Re-triagem" : "Nova triagem"}</CardTitle>
        <CardDescription>
          Três eixos: clínico (bandeiras), funcional (0–100) e social.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-5" onSubmit={onSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="cid">CID-10</Label>
              <Input id="cid" name="cid" placeholder="G40" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="motivo">Motivo do encaminhamento</Label>
              <Input id="motivo" name="motivo" required minLength={3} />
            </div>
          </div>

          <fieldset className="grid gap-2">
            <legend className="text-sm font-medium">Bandeiras clínicas</legend>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="motivoAgudo" /> Motivo agudo
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="altaHospitalarRecente" /> Alta
              hospitalar recente
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="posCirurgico" /> Pós-cirúrgico
            </label>
          </fieldset>

          <fieldset className="grid gap-3">
            <legend className="text-sm font-medium">
              Eixo funcional (0–100; 100 = independência total)
            </legend>
            {FUNCIONAL_LABELS.map((rotulo, i) => (
              <div key={rotulo} className="grid gap-1">
                <Label htmlFor={`funcional-${i}`}>{rotulo}</Label>
                <input
                  id={`funcional-${i}`}
                  name={`funcional-${i}`}
                  type="range"
                  min={0}
                  max={100}
                  defaultValue={100}
                  className="accent-primary"
                />
              </div>
            ))}
          </fieldset>

          <fieldset className="grid gap-3">
            <legend className="text-sm font-medium">Eixo social</legend>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="cuidadorPresente" defaultChecked />{" "}
              Cuidador presente
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="zaritScore">Zarit (0–24)</Label>
                <Input
                  id="zaritScore"
                  name="zaritScore"
                  type="number"
                  min={0}
                  max={24}
                  defaultValue={0}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="vulnerabilidades">Vulnerabilidades (nº)</Label>
                <Input
                  id="vulnerabilidades"
                  name="vulnerabilidades"
                  type="number"
                  min={0}
                  defaultValue={0}
                />
              </div>
            </div>
          </fieldset>

          <div className="grid gap-2">
            <Label htmlFor="justificativa">
              Justificativa clínica (obrigatória se a elegibilidade exigir
              decisão)
            </Label>
            <textarea
              id="justificativa"
              name="justificativa"
              rows={3}
              maxLength={500}
              className="border-input bg-background flex w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>

          {erro ? (
            <p role="alert" className="text-sm text-destructive">
              {erro}
            </p>
          ) : null}

          <Button type="submit" disabled={pending}>
            {pending ? "Classificando…" : ptsId ? "Registrar re-triagem" : "Concluir triagem"}
          </Button>
        </form>

        {naoElegivel ? (
          // Fora do <form> acima: <form> dentro de <form> é HTML inválido e o
          // browser confunde os submits (o botão "Emitir guia" acabava
          // reenviando a triagem).
          <div className="mt-4 space-y-2">
            <p
              role="alert"
              data-testid="nao-elegivel"
              className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {naoElegivel} Procure a unidade básica de saúde (APS).
            </p>
            <GuiaContrarreferenciaForm
              pacienteId={pacienteId}
              ptsId={ptsId}
              motivoInicial={naoElegivel}
            />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
