"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { criarPaciente } from "@/server/reception/paciente";
import { buscarBaseline } from "@/server/reception/baseline";
import type { CamposBaseline, OrigensBaseline } from "@/server/reception/baseline-campos";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SecaoDadosBasicos } from "./secao-dados-basicos";
import { SecaoLinhaBase } from "./secao-linha-base";
import { SecaoCuidador } from "./secao-cuidador";
import { SecaoConsentimento } from "./secao-consentimento";

export function NovoPacienteForm({
  documentoInicial,
}: {
  documentoInicial: string;
}) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [pacienteId, setPacienteId] = useState<string | null>(null);
  const [provisorio, setProvisorio] = useState(false);
  const [prazoRegularizacao, setPrazoRegularizacao] = useState<Date | null>(null);

  const docInicialLimpo = documentoInicial.replace(/\D+/g, "");

  const [cpf, setCpf] = useState(docInicialLimpo.length === 11 ? documentoInicial : "");
  const [cns, setCns] = useState(docInicialLimpo.length === 15 ? documentoInicial : "");
  const [nome, setNome] = useState("");
  const [dtnasc, setDtnasc] = useState("");
  const [sexo, setSexo] = useState<"MASCULINO" | "FEMININO" | "OUTRO">("MASCULINO");
  const [municipioOrigem, setMunicipioOrigem] = useState("");
  const [endereco, setEndereco] = useState("");
  const [origemGeral, setOrigemGeral] = useState<"digitado" | "importado">("digitado");

  const [buscando, setBuscando] = useState(false);
  const [mensagemBusca, setMensagemBusca] = useState<{ tipo: "erro" | "aviso" | "sucesso", texto: string } | null>(null);

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

  async function handleBuscarEsus() {
    const doc = cpf.trim() || cns.trim();
    if (!doc) {
      setMensagemBusca({ tipo: "erro", texto: "Informe o CPF ou CNS para buscar." });
      return;
    }
    setBuscando(true);
    setMensagemBusca(null);

    const res = await buscarBaseline({ identificador: doc });
    setBuscando(false);

    if (res.status === "ok") {
      const b = res.baseline;
      if (b.nome) setNome(b.nome);
      if (b.dtnasc) setDtnasc(b.dtnasc);
      if (b.sexo) setSexo(b.sexo);
      if (b.endereco) setEndereco(b.endereco);

      setOrigemGeral("importado");

      setCampos({
        diagnosticos: b.diagnosticos,
        alergias: b.alergias,
        medicacoes: b.medicacoes,
        internacoes: b.internacoes,
      });
      setOrigens({
        diagnosticos: "importado",
        alergias: "importado",
        medicacoes: "importado",
        internacoes: "importado",
      });
      setMensagemBusca({ tipo: "sucesso", texto: "Dados encontrados no e-SUS e importados." });
    } else if (res.status === "nao_encontrado") {
      setMensagemBusca({ tipo: "aviso", texto: "Nenhum registro encontrado no e-SUS. Preencha manualmente." });
    } else {
      setMensagemBusca({ tipo: "erro", texto: "e-SUS indisponível. Preencha manualmente." });
    }
  }

  function editarLista(chave: keyof CamposBaseline, texto: string) {
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

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro(null);
    setPending(true);

    const resultado = await criarPaciente({
      nome,
      cpf: cpf || undefined,
      cns: cns || undefined,
      dtnasc,
      sexo,
      municipioOrigem,
      enderecoJson: endereco ? { logradouro: endereco } : undefined,
      origem: origemGeral,
      baseline: {
        campos,
        origens,
      },
    });

    if (!resultado.ok) {
      setErro(resultado.erro);
      setPending(false);
      return;
    }

    setProvisorio(resultado.provisorio);
    setPrazoRegularizacao(
      resultado.prazoRegularizacao ? new Date(resultado.prazoRegularizacao) : null,
    );
    setPacienteId(resultado.pacienteId);
  }

  const destaqueGeral = origemGeral === "importado"
    ? "border-sky-500 bg-sky-50 dark:bg-sky-950/40"
    : "";

  if (pacienteId) {
    return (
      <div className="w-full max-w-lg space-y-6">
        <p className="text-sm text-muted-foreground">
          Paciente cadastrado. Complete as seções abaixo ou{" "}
          <button
            type="button"
            className="underline"
            onClick={() => router.push(`/pacientes/${pacienteId}`)}
          >
            siga para o paciente
          </button>
          .
        </p>
        {provisorio && prazoRegularizacao ? (
          <p
            role="alert"
            data-testid="alerta-provisorio"
            className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning"
          >
            Cadastro provisório — PPI não pactuada para o município de
            origem. Regularizar até{" "}
            {prazoRegularizacao.toLocaleDateString("pt-BR")}.
          </p>
        ) : null}
        <SecaoCuidador pacienteId={pacienteId} />
        <SecaoConsentimento pacienteId={pacienteId} />
        <Button onClick={() => router.push(`/pacientes/${pacienteId}`)}>
          Ir para o paciente
        </Button>
      </div>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Novo paciente</CardTitle>
        <CardDescription>Cadastro no CER do seu vínculo e Linha de Base.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-6" onSubmit={onSubmit}>
          <SecaoDadosBasicos
            cpf={cpf}
            cns={cns}
            nome={nome}
            dtnasc={dtnasc}
            sexo={sexo}
            municipioOrigem={municipioOrigem}
            endereco={endereco}
            destaqueGeral={destaqueGeral}
            buscando={buscando}
            mensagemBusca={mensagemBusca}
            onCpfChange={setCpf}
            onCnsChange={setCns}
            onNomeChange={(v) => { setNome(v); setOrigemGeral("digitado"); }}
            onDtnascChange={(v) => { setDtnasc(v); setOrigemGeral("digitado"); }}
            onSexoChange={(v) => { setSexo(v); setOrigemGeral("digitado"); }}
            onMunicipioOrigemChange={setMunicipioOrigem}
            onEnderecoChange={(v) => { setEndereco(v); setOrigemGeral("digitado"); }}
            onBuscarEsus={handleBuscarEsus}
          />

          <hr className="border-border" />

          <SecaoLinhaBase campos={campos} origens={origens} onEditarLista={editarLista} />

          {erro ? (
            <p role="alert" className="text-sm text-destructive">
              {erro}
            </p>
          ) : null}
          <Button type="submit" loading={pending} className="w-full">
            {pending ? "Salvando…" : "Cadastrar Paciente e Linha de Base"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
