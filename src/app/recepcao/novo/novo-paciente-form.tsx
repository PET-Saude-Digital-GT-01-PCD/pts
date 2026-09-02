"use client";

import { useState, useTransition, useCallback, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Search } from "lucide-react";

import { criarPaciente, encaminharParaTriagem } from "@/server/reception/paciente";
import { registrarCuidador } from "@/server/reception/cuidador";
import {
  registrarConsentimento,
  revogarConsentimento,
} from "@/server/reception/consentimento";
import { buscarBaseline } from "@/server/reception/baseline";
import type { CamposBaseline, OrigensBaseline } from "@/server/reception/baseline-campos";

import { ToastSucesso } from "@/components/ui/toast-sucesso";
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

function listaParaTexto(lista: string[]): string {
  return lista.join(", ");
}

export function NovoPacienteForm({
  documentoInicial,
}: {
  documentoInicial: string;
}) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [pacienteId, setPacienteId] = useState<string | null>(null);

  const docInicialLimpo = documentoInicial.replace(/\D+/g, "");
  
  const [cpf, setCpf] = useState(docInicialLimpo.length === 11 ? documentoInicial : "");
  const [cns, setCns] = useState(docInicialLimpo.length === 15 ? documentoInicial : "");
  const [nome, setNome] = useState("");
  const [dtnasc, setDtnasc] = useState("");
  const [sexo, setSexo] = useState<"MASCULINO" | "FEMININO" | "OUTRO">("MASCULINO");
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

    setPacienteId(resultado.pacienteId);
  }

  const destaqueImportado = (chave: keyof OrigensBaseline) =>
    origens[chave] === "importado"
      ? "border-sky-500 bg-sky-50 dark:bg-sky-950/40"
      : "";

  const destaqueGeral = origemGeral === "importado"
    ? "border-sky-500 bg-sky-50 dark:bg-sky-950/40"
    : "";

  if (pacienteId) {
    return (
      <PosCadastro
        pacienteId={pacienteId}
        router={router}
      />
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
          <div className="grid gap-4">
            <div className="flex items-end gap-2">
              <div className="grid gap-2 flex-1">
                <Label htmlFor="cpf">CPF</Label>
                <Input
                  id="cpf"
                  name="cpf"
                  inputMode="numeric"
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value)}
                />
              </div>
              <div className="grid gap-2 flex-1">
                <Label htmlFor="cns">CNS</Label>
                <Input
                  id="cns"
                  name="cns"
                  inputMode="numeric"
                  value={cns}
                  onChange={(e) => setCns(e.target.value)}
                />
              </div>
              <Button type="button" variant="secondary" onClick={handleBuscarEsus} disabled={buscando}>
                <Search className="w-4 h-4 mr-2" />
                {buscando ? "Buscando..." : "e-SUS"}
              </Button>
            </div>
            
            {mensagemBusca && (
              <p className={`text-sm font-medium ${mensagemBusca.tipo === 'erro' ? 'text-destructive' : mensagemBusca.tipo === 'sucesso' ? 'text-sky-600' : 'text-muted-foreground'}`}>
                {mensagemBusca.texto}
              </p>
            )}

            <div className="grid gap-2">
              <Label htmlFor="nome">Nome completo</Label>
              <Input 
                id="nome" 
                name="nome" 
                required 
                minLength={3} 
                maxLength={120}
                value={nome}
                onChange={(e) => { setNome(e.target.value); setOrigemGeral("digitado"); }}
                className={destaqueGeral}
              />
            </div>
            
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="dtnasc">Data de nascimento</Label>
                <Input 
                  id="dtnasc" 
                  name="dtnasc" 
                  type="date" 
                  required 
                  value={dtnasc}
                  onChange={(e) => { setDtnasc(e.target.value); setOrigemGeral("digitado"); }}
                  className={destaqueGeral}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="sexo">Sexo</Label>
                <select
                  id="sexo"
                  name="sexo"
                  required
                  value={sexo}
                  onChange={(e) => { setSexo(e.target.value as "MASCULINO" | "FEMININO" | "OUTRO"); setOrigemGeral("digitado"); }}
                  className={`border-input bg-background flex h-9 w-full rounded-md border px-3 text-sm ${destaqueGeral}`}
                >
                  <option value="MASCULINO">Masculino</option>
                  <option value="FEMININO">Feminino</option>
                  <option value="OUTRO">Outro</option>
                </select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="endereco">Endereço (opcional)</Label>
              <Input 
                id="endereco" 
                name="endereco" 
                autoComplete="street-address" 
                value={endereco}
                onChange={(e) => { setEndereco(e.target.value); setOrigemGeral("digitado"); }}
                className={destaqueGeral}
              />
            </div>
          </div>

          <hr className="border-border" />

          <div className="grid gap-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-semibold">Linha de Base Clínica</h3>
              <span className="text-xs text-muted-foreground">Opcional. Os campos destacados vieram da importação.</span>
            </div>
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
          </div>

          {erro ? (
            <p role="alert" className="text-sm text-destructive">
              {erro}
            </p>
          ) : null}
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Salvando…" : "Cadastrar Paciente e Linha de Base"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function PosCadastro({
  pacienteId,
  router,
}: {
  pacienteId: string;
  router: ReturnType<typeof useRouter>;
}) {
  const [encPending, startEncaminhar] = useTransition();
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [erroEnc, setErroEnc] = useState<string | null>(null);
  const [encaminhado, setEncaminhado] = useState(false);
  const fecharToast = useCallback(() => setToastMsg(null), []);

  function handleEncaminhar() {
    setErroEnc(null);
    startEncaminhar(async () => {
      const res = await encaminharParaTriagem(pacienteId);
      if (res.ok) {
        setEncaminhado(true);
        setToastMsg("Paciente encaminhado para triagem com sucesso!");
      } else {
        setErroEnc(res.erro);
      }
    });
  }

  return (
    <div className="w-full max-w-lg space-y-6 mx-auto">
      <p className="text-sm text-muted-foreground text-center">
        Paciente cadastrado com sucesso. Complete as seções adicionais abaixo.
      </p>
      
      <SecaoCuidador pacienteId={pacienteId} />
      <SecaoConsentimento pacienteId={pacienteId} />

      {erroEnc && (
        <p role="alert" className="text-sm text-destructive">
          {erroEnc}
        </p>
      )}

      <div className="flex gap-3 justify-center">
        {!encaminhado ? (
          <Button
            onClick={handleEncaminhar}
            disabled={encPending}
            className="gap-2"
          >
            <ArrowRight className="h-4 w-4" />
            {encPending ? "Encaminhando…" : "Encaminhar para triagem"}
          </Button>
        ) : (
          <Button
            variant="outline"
            onClick={() => router.push("/recepcao")}
          >
            Voltar para recepção
          </Button>
        )}
        <Button
          variant="ghost"
          onClick={() => router.push(`/pacientes/${pacienteId}`)}
        >
          Ver paciente
        </Button>
      </div>

      <ToastSucesso
        mensagem={toastMsg ?? ""}
        aberto={!!toastMsg}
        onFechar={fecharToast}
      />
    </div>
  );
}

function SecaoCuidador({ pacienteId }: { pacienteId: string }) {
  const [erro, setErro] = useState<string | null>(null);
  const [zaritAltoAviso, setZaritAltoAviso] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro(null);
    setPending(true);

    const form = new FormData(event.currentTarget);
    const idade = form.get("idade");
    const zarit = form.get("zaritScore");
    const resultado = await registrarCuidador({
      pacienteId,
      nome: form.get("nome"),
      parentesco: form.get("parentesco"),
      idade: idade ? Number(idade) : undefined,
      zaritScore: zarit === "" ? undefined : Number(zarit),
    });

    if (!resultado.ok) {
      setErro(resultado.erro);
      setPending(false);
      return;
    }

    setZaritAltoAviso(resultado.zaritAlto);
    setSalvo(true);
    setPending(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cuidador</CardTitle>
        <CardDescription>Mapeamento biopsicossocial e Zarit.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4" onSubmit={onSubmit}>
          <div className="grid gap-2">
            <Label htmlFor="cuidador-nome">Nome do cuidador</Label>
            <Input id="cuidador-nome" name="nome" required minLength={3} />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="parentesco">Parentesco</Label>
              <Input id="parentesco" name="parentesco" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="idade">Idade</Label>
              <Input id="idade" name="idade" type="number" min={0} max={120} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="zaritScore">Zarit (0–24)</Label>
              <Input
                id="zaritScore"
                name="zaritScore"
                type="number"
                min={0}
                max={24}
              />
            </div>
          </div>
          {zaritAltoAviso ? (
            <p
              role="alert"
              data-testid="zarit-alto"
              className="text-destructive rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm font-medium"
            >
              Zarit ALTO: sobrecarga intensa do cuidador. Encaminhar ao Serviço
              Social.
            </p>
          ) : null}
          {erro ? (
            <p role="alert" className="text-sm text-destructive">
              {erro}
            </p>
          ) : null}
          <Button type="submit" variant="outline" disabled={pending || salvo}>
            {salvo ? "Cuidador salvo" : pending ? "Salvando…" : "Registrar cuidador"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function SecaoConsentimento({ pacienteId }: { pacienteId: string }) {
  const [erro, setErro] = useState<string | null>(null);
  const [consentimentoId, setConsentimentoId] = useState<string | null>(null);
  const [revogado, setRevogado] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro(null);
    setPending(true);

    const form = new FormData(event.currentTarget);
    const resultado = await registrarConsentimento({
      pacienteId,
      termoVersao: form.get("termoVersao"),
      canal: form.get("canal"),
      assinaturaRef: form.get("assinaturaRef") || undefined,
    });

    if (!resultado.ok) {
      setErro(resultado.erro);
      setPending(false);
      return;
    }

    setConsentimentoId(resultado.consentimentoId);
    setPending(false);
  }

  async function onRevogar() {
    if (!consentimentoId) return;
    setErro(null);
    setPending(true);
    const resultado = await revogarConsentimento({ consentimentoId });
    if (!resultado.ok) {
      setErro(resultado.erro);
      setPending(false);
      return;
    }
    setRevogado(true);
    setPending(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Consentimento LGPD</CardTitle>
        <CardDescription>
          Registro append-only. Revogação preserva o histórico.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4" onSubmit={onSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="termoVersao">Versão do termo</Label>
              <Input id="termoVersao" name="termoVersao" defaultValue="v1" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="canal">Canal</Label>
              <select
                id="canal"
                name="canal"
                required
                className="border-input bg-background flex h-9 w-full rounded-md border px-3 text-sm"
              >
                <option value="TABLET">Tablet</option>
                <option value="WHATSAPP">WhatsApp</option>
                <option value="GOVBR">Gov.br</option>
              </select>
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="assinaturaRef">Referência de assinatura (opcional)</Label>
            <Input id="assinaturaRef" name="assinaturaRef" />
          </div>
          {erro ? (
            <p role="alert" className="text-sm text-destructive">
              {erro}
            </p>
          ) : null}
          {revogado ? (
            <p className="text-warning text-sm">Consentimento revogado.</p>
          ) : null}
          {consentimentoId && !revogado ? (
            <Button
              type="button"
              variant="outline"
              className="text-destructive"
              onClick={onRevogar}
              disabled={pending}
            >
              Revogar consentimento
            </Button>
          ) : (
            <Button type="submit" variant="outline" disabled={pending}>
              {consentimentoId ? "Registrado" : pending ? "Salvando…" : "Registrar consentimento"}
            </Button>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
