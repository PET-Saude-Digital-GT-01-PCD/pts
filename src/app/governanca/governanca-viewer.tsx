"use client";

import { useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { buscarIndicadores, exportarCsv, type PainelIndicadores } from "@/server/governance/relatorios";
import { IndicadoresCards } from "./indicadores-cards";

type ErrosFiltro = { desde?: string; ate?: string; cadencia?: string };

function dataValida(valor: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor) || valor.startsWith("0000")) return false;
  const data = new Date(`${valor}T00:00:00.000Z`);
  return Number.isFinite(data.getTime()) && data.toISOString().slice(0, 10) === valor;
}

function dataExibida(valor: string): string {
  return valor.split("-").reverse().join("/");
}

const FORMATADOR_GERACAO = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Fortaleza", dateStyle: "short", timeStyle: "medium",
});

export function GovernancaViewer({ painelInicial }: { painelInicial: PainelIndicadores }) {
  const [painel, setPainel] = useState(painelInicial);
  const [desde, setDesde] = useState(painelInicial.periodo.desde);
  const [ate, setAte] = useState(painelInicial.periodo.ate);
  const [cadencia, setCadencia] = useState(String(painelInicial.cadenciaRevisaoDias));
  const [carregando, setCarregando] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [errosFiltro, setErrosFiltro] = useState<ErrosFiltro>({});
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState("");
  const operacaoEmCurso = useRef(false);
  const ocupado = carregando || exportando;
  const alterado = desde !== painel.periodo.desde || ate !== painel.periodo.ate ||
    cadencia !== String(painel.cadenciaRevisaoDias);

  function editarFiltro(alterar: () => void) {
    alterar();
    setErrosFiltro({});
    setErro(null);
    setAviso("");
  }

  async function aplicarFiltro(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (operacaoEmCurso.current) return;
    const erros: ErrosFiltro = {};
    if (!dataValida(desde)) erros.desde = "Informe uma data inicial válida.";
    if (!dataValida(ate)) erros.ate = "Informe uma data final válida.";
    if (!erros.desde && !erros.ate && desde > ate) {
      erros.ate = "A data final deve ser igual ou posterior à data inicial.";
    }
    if (!/^\d+$/.test(cadencia) || Number(cadencia) < 1 || Number(cadencia) > 365) {
      erros.cadencia = "Informe um número inteiro entre 1 e 365 dias.";
    }
    setErrosFiltro(erros);
    setErro(null);
    setAviso("");
    if (Object.keys(erros).length) {
      const campo = erros.desde ? "desde" : erros.ate ? "ate" : "cadencia";
      e.currentTarget.querySelector<HTMLInputElement>(`#${campo}`)?.focus();
      return;
    }
    operacaoEmCurso.current = true;
    setCarregando(true);
    try {
      const novoPainel = await buscarIndicadores({ desde, ate, cadenciaRevisaoDias: Number(cadencia) });
      setPainel(novoPainel);
      setDesde(novoPainel.periodo.desde);
      setAte(novoPainel.periodo.ate);
      setCadencia(String(novoPainel.cadenciaRevisaoDias));
      setAviso("Indicadores atualizados.");
    } catch {
      setErro("Não foi possível atualizar os indicadores. O painel anterior foi mantido. Tente novamente.");
    } finally {
      operacaoEmCurso.current = false;
      setCarregando(false);
    }
  }

  async function exportar() {
    if (operacaoEmCurso.current || alterado || !painel.podeExportar) return;
    operacaoEmCurso.current = true;
    setExportando(true);
    setErro(null);
    setAviso("");
    let url: string | undefined;
    let link: HTMLAnchorElement | undefined;
    try {
      const arquivo = await exportarCsv(painel.tokenExportacao);
      // O contrato do arquivo (docs/07) é UTF-8 com BOM — e o sha256 auditado
      // no servidor é calculado sobre o conteúdo com BOM. Garante o BOM aqui
      // para o byte baixado ser idêntico ao auditado.
      const texto = arquivo.conteudo.startsWith("\uFEFF") ? arquivo.conteudo : `\uFEFF${arquivo.conteudo}`;
      url = URL.createObjectURL(new Blob([texto], { type: arquivo.tipoConteudo }));
      link = document.createElement("a");
      link.href = url;
      link.download = arquivo.nomeArquivo;
      document.body.appendChild(link);
      link.click();
      setAviso("Download do CSV iniciado com os indicadores exibidos neste painel.");
    } catch {
      setErro("Não foi possível exportar o CSV. Atualize o painel e tente novamente. Se o erro persistir, verifique sua permissão para relatórios.");
    } finally {
      link?.remove();
      // Aguarda o navegador iniciar o download antes de liberar o endereço.
      if (url) {
        const endereco = url;
        setTimeout(() => URL.revokeObjectURL(endereco), 1000);
      }
      operacaoEmCurso.current = false;
      setExportando(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <form
        className="flex flex-wrap items-end gap-3 rounded-2xl bg-surface-raised p-4 shadow-soft ring-1 ring-foreground/5"
        onSubmit={aplicarFiltro} noValidate aria-label="Filtros dos indicadores"
      >
        <FormField id="desde" label="Desde" erro={errosFiltro.desde} obrigatorio>
          {(aria) => <Input {...aria} type="date" required disabled={ocupado} value={desde}
            onChange={(e) => editarFiltro(() => setDesde(e.target.value))} />}
        </FormField>
        <FormField id="ate" label="Até" erro={errosFiltro.ate} obrigatorio>
          {(aria) => <Input {...aria} type="date" required disabled={ocupado} value={ate}
            onChange={(e) => editarFiltro(() => setAte(e.target.value))} />}
        </FormField>
        <FormField id="cadencia" label="Janela de revisão (dias)" erro={errosFiltro.cadencia} obrigatorio>
          {(aria) => <Input {...aria} type="number" required min={1} max={365} step={1}
            disabled={ocupado} value={cadencia} className="max-w-48"
            onChange={(e) => editarFiltro(() => setCadencia(e.target.value))} />}
        </FormField>
        <Button type="submit" variant="outline" loading={carregando} disabled={exportando}>
          {carregando ? "Atualizando…" : "Aplicar período"}
        </Button>
        <Button type="button" onClick={exportar} loading={exportando}
          disabled={carregando || alterado || !painel.podeExportar} aria-describedby="orientacao-exportacao">
          {exportando ? "Exportando…" : "Exportar CSV"}
        </Button>
        <p className="w-full text-xs text-muted-foreground">
          O período inclui os dois dias completos no horário de Fortaleza (UTC−03).
          A janela de revisão define quantos dias uma revisão pode ter para contar como em dia neste relatório;
          não altera os prazos pactuados de cuidado.
        </p>
        <p id="orientacao-exportacao" className="w-full text-sm text-muted-foreground">
          {!painel.podeExportar
            ? "Sua permissão permite consultar o painel. Para exportar, solicite acesso aos relatórios de governança."
            : alterado
              ? "Há filtros ainda não aplicados. Aplique o período para atualizar o painel e liberar a exportação."
              : "O CSV exporta os valores exibidos, com período, CER e horário de geração. Para atualizar os dados, aplique o período novamente."}
        </p>
      </form>
      {erro ? <p role="alert" className="text-sm text-destructive">{erro}</p> : null}
      <p role="status" className="text-sm text-muted-foreground">
        {carregando ? "Atualizando indicadores…" : exportando ? "Preparando o CSV…" : aviso}
      </p>
      <section aria-label="Identificação do relatório" className="space-y-1 text-sm" data-testid="metadados-relatorio">
        <p className="font-medium">CER: {painel.cer.nome}</p>
        <p>Período aplicado: {dataExibida(painel.periodo.desde)} a {dataExibida(painel.periodo.ate)} · Janela de revisão: {painel.cadenciaRevisaoDias} dias</p>
        <p className="text-muted-foreground">Gerado em <time dateTime={painel.geradoEm}>
          {FORMATADOR_GERACAO.format(new Date(painel.geradoEm))}
        </time> (Fortaleza, UTC−03)</p>
        <p className="text-xs text-muted-foreground">
          Indicadores de situação atual retratam o momento da geração. Indicadores do período usam o intervalo aplicado.
          Um período passado não reconstrói a situação histórica dos PTS.
        </p>
      </section>
      <IndicadoresCards indicadores={painel.indicadores} carregando={carregando} />
    </div>
  );
}
