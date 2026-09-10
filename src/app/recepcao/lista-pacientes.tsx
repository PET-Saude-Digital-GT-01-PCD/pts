"use client";

import { useState, useTransition, useCallback } from "react";
import Link from "next/link";
import {
  Stethoscope,
  AlertTriangle,
  Pill,
  BedDouble,
  Wifi,
  Edit2,
  ArrowRight,
  Check,
} from "lucide-react";

import { encaminharParaTriagem } from "@/server/reception/paciente";
import type { PacienteListado } from "@/server/reception/paciente";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ToastSucesso } from "@/components/ui/toast-sucesso";

function BadgeOrigem({ origem }: { origem: string }) {
  if (origem === "importado") {
    return (
      <Badge variant="importado" className="gap-1 text-[10px]">
        <Wifi className="h-2.5 w-2.5" />
        e-SUS
      </Badge>
    );
  }
  return (
    <Badge variant="digitado" className="gap-1 text-[10px]">
      <Edit2 className="h-2.5 w-2.5" />
      Digitado
    </Badge>
  );
}

function BaselineResumo({
  baseline,
}: {
  baseline: PacienteListado["baseline"];
}) {
  if (!baseline) {
    return (
      <p className="text-xs text-muted-foreground italic">
        Sem linha de base registrada.
      </p>
    );
  }

  const origens = (baseline.origemJson ?? {}) as Record<string, string>;
  const diagnosticos = (baseline.diagnosticosJson ?? []) as string[];
  const alergias = (baseline.alergiasJson ?? []) as string[];
  const medicacoes = (baseline.medicacoesJson ?? []) as Array<{
    nome: string;
    dosagem?: string | null;
  }>;
  const internacoes = (baseline.internacoesJson ?? []) as string[];

  return (
    <div className="grid gap-2 text-xs sm:grid-cols-2">
      {diagnosticos.length > 0 && (
        <div className="flex items-start gap-1.5">
          <Stethoscope className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
          <div>
            <span className="font-medium">Diagnósticos:</span>{" "}
            {diagnosticos.join(", ")}
            {origens.diagnosticos && (
              <span className="ml-1">
                <BadgeOrigem origem={origens.diagnosticos} />
              </span>
            )}
          </div>
        </div>
      )}
      {alergias.length > 0 && (
        <div className="flex items-start gap-1.5">
          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
          <div>
            <span className="font-medium">Alergias:</span>{" "}
            {alergias.join(", ")}
            {origens.alergias && (
              <span className="ml-1">
                <BadgeOrigem origem={origens.alergias} />
              </span>
            )}
          </div>
        </div>
      )}
      {medicacoes.length > 0 && (
        <div className="flex items-start gap-1.5">
          <Pill className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
          <div>
            <span className="font-medium">Medicações:</span>{" "}
            {medicacoes.map((m) => m.nome).join(", ")}
            {origens.medicacoes && (
              <span className="ml-1">
                <BadgeOrigem origem={origens.medicacoes} />
              </span>
            )}
          </div>
        </div>
      )}
      {internacoes.length > 0 && (
        <div className="flex items-start gap-1.5">
          <BedDouble className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
          <div>
            <span className="font-medium">Internações:</span>{" "}
            {internacoes.join(", ")}
            {origens.internacoes && (
              <span className="ml-1">
                <BadgeOrigem origem={origens.internacoes} />
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatusPaciente({ paciente }: { paciente: PacienteListado }) {
  if (paciente.pts.length > 0) {
    return (
      <Badge variant="outline" className="text-xs">
        Caso ativo
      </Badge>
    );
  }
  if (paciente.encaminhadoTriagem) {
    return (
      <Badge className="gap-1 bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 text-xs">
        <ArrowRight className="h-3 w-3" />
        Na fila de triagem
      </Badge>
    );
  }
  return null;
}

export function ListaPacientes({
  pacientes: initial,
}: {
  pacientes: PacienteListado[];
}) {
  const [pacientes, setPacientes] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [encaminhando, setEncaminhando] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const fecharToast = useCallback(() => setToastMsg(null), []);

  function handleEncaminhar(pacienteId: string, nome: string) {
    setEncaminhando(pacienteId);
    setErro(null);
    startTransition(async () => {
      const resultado = await encaminharParaTriagem(pacienteId);
      if (resultado.ok) {
        setPacientes((prev) =>
          prev.map((p) =>
            p.id === pacienteId ? { ...p, encaminhadoTriagem: true } : p
          )
        );
        setToastMsg(`${nome} encaminhado(a) para triagem com sucesso!`);
      } else {
        setErro(resultado.erro);
      }
      setEncaminhando(null);
    });
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {pacientes.map((p) => (
          <Card key={p.id} className="flex flex-col">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-base">
                    <Link
                      href={`/pacientes/${p.id}`}
                      className="hover:underline"
                    >
                      {p.nome}
                    </Link>
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {p.cpf ? `CPF: ${p.cpf}` : ""}
                    {p.cpf && p.cns ? " · " : ""}
                    {p.cns ? `CNS: ${p.cns}` : ""}
                  </p>
                </div>
                <StatusPaciente paciente={p} />
              </div>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-3">
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span>
                  Nasc.: {p.dtnasc.toLocaleDateString("pt-BR")}
                </span>
                <span>Sexo: {p.sexo}</span>
              </div>

              <BaselineResumo baseline={p.baseline} />

              <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                <Link href={`/pacientes/${p.id}`}>
                  <Button variant="ghost" size="sm" className="text-xs">
                    Ver detalhes
                  </Button>
                </Link>
                {!p.encaminhadoTriagem && p.pts.length === 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-xs"
                    disabled={pending && encaminhando === p.id}
                    onClick={() => handleEncaminhar(p.id, p.nome)}
                  >
                    {pending && encaminhando === p.id ? (
                      "Encaminhando…"
                    ) : (
                      <>
                        <ArrowRight className="h-3 w-3" />
                        Encaminhar triagem
                      </>
                    )}
                  </Button>
                )}
                {p.encaminhadoTriagem && p.pts.length === 0 && (
                  <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                    <Check className="h-3 w-3" />
                    Encaminhado
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {erro && (
        <p role="alert" className="text-sm text-destructive mt-2">
          {erro}
        </p>
      )}

      <ToastSucesso
        mensagem={toastMsg ?? ""}
        aberto={!!toastMsg}
        onFechar={fecharToast}
      />
    </>
  );
}
