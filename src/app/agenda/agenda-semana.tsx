"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { campoNativoClasses } from "@/lib/utils";
import {
  cancelarAtendimento,
  criarAgendamento,
  reagendarAtendimento,
  registrarResultadoAtendimento,
  type buscarSemanaAgenda,
} from "@/server/care-plan/agenda";

type AgendaDados = NonNullable<Awaited<ReturnType<typeof buscarSemanaAgenda>>>;
type CartaoAgendamento = AgendaDados["agendamentos"][number];

const STATUS: Record<CartaoAgendamento["status"], string> = {
  AGENDADO: "Agendado",
  REALIZADO: "Realizado",
  FALTA: "Falta",
  CANCELADO: "Cancelado",
  REMARCADO: "Remarcado",
};

const SEMAFORO: Record<string, string> = {
  VERDE: "Reunião verde",
  AMARELO: "Reunião amarela",
  VERMELHO: "Reunião vermelha",
};

function dateTimeLocal(data: Date): string {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Recife",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(data);
  const valor = (chave: string) => partes.find((p) => p.type === chave)?.value ?? "00";
  return `${valor("year")}-${valor("month")}-${valor("day")}T${valor("hour")}:${valor("minute")}`;
}

function hora(data: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Recife",
    hour: "2-digit",
    minute: "2-digit",
  }).format(data);
}

function diaCivil(data: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Recife",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(data);
}

function diaSemana(dataCivil: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Recife",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(`${dataCivil}T12:00:00-03:00`));
}

function dataProximaMeiaHora() {
  const agoraRecife = dateTimeLocal(new Date());
  const [data, hora] = agoraRecife.split("T");
  const [ano, mes, dia] = data.split("-").map(Number);
  const [horas, minutos] = hora.split(":").map(Number);
  const arredondado = new Date(Date.UTC(ano, mes - 1, dia, horas, minutos + 30));
  if (arredondado.getUTCMinutes() % 30 !== 0) {
    arredondado.setUTCMinutes(arredondado.getUTCMinutes() < 30 ? 30 : 60, 0, 0);
  } else {
    arredondado.setUTCSeconds(0, 0);
  }
  return `${arredondado.toISOString().slice(0, 10)}T${arredondado.toISOString().slice(11, 16)}`;
}

function converterHorarioRecifeParaIso(horarioLocal: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(horarioLocal)) return null;
  const data = new Date(`${horarioLocal}:00-03:00`);
  return Number.isNaN(data.getTime()) ? null : data.toISOString();
}

export function AgendaSemana({ agenda }: { agenda: AgendaDados }) {
  const router = useRouter();
  const [casoSelecionado, setCasoSelecionado] = useState(agenda.casos[0]?.ptsId ?? "");
  const [dataInicial, setDataInicial] = useState(dataProximaMeiaHora);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [aberto, setAberto] = useState<{ id: string; acao: "remarcar" | "cancelar" } | null>(null);

  const casoAtual = agenda.casos.find((caso) => caso.ptsId === casoSelecionado);
  const dias = useMemo(() => {
    const [ano, mes, dia] = agenda.semana.split("-").map(Number);
    return Array.from({ length: 7 }, (_, i) => {
      const data = new Date(Date.UTC(ano, mes - 1, dia + i, 12));
      const civil = data.toISOString().slice(0, 10);
      return { civil, titulo: diaSemana(civil) };
    });
  }, [agenda.semana]);

  async function onAgendar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro(null);
    setSucesso(null);
    setOcupado("novo");
    const form = new FormData(event.currentTarget);
    const horarioLocal = String(form.get("inicioEm") ?? "");
    const inicioEm = converterHorarioRecifeParaIso(horarioLocal);
    if (!inicioEm) {
      setOcupado(null);
      setErro("Informe a data e o horário do atendimento.");
      return;
    }
    const resultado = await criarAgendamento({
      ptsId: String(form.get("ptsId") ?? ""),
      profissionalId: String(form.get("profissionalId") ?? ""),
      inicioEm,
      duracaoMinutos: Number(form.get("duracaoMinutos")),
    });
    setOcupado(null);
    if (!resultado.ok) {
      setErro(resultado.erro);
      return;
    }
    setSucesso("Atendimento agendado.");
    (event.currentTarget as HTMLFormElement).reset();
    setDataInicial(dataProximaMeiaHora());
    router.refresh();
  }

  async function onRemarcar(event: FormEvent<HTMLFormElement>, item: CartaoAgendamento) {
    event.preventDefault();
    setErro(null);
    setSucesso(null);
    setOcupado(item.id);
    const horarioLocal = String(new FormData(event.currentTarget).get("inicioEm") ?? "");
    const inicioEm = converterHorarioRecifeParaIso(horarioLocal);
    if (!inicioEm) {
      setOcupado(null);
      setErro("Informe a nova data e o horário do atendimento.");
      return;
    }
    const resultado = await reagendarAtendimento({
      agendamentoId: item.id,
      inicioEm,
    });
    setOcupado(null);
    if (!resultado.ok) {
      setErro(resultado.erro);
      return;
    }
    setAberto(null);
    setSucesso("Atendimento remarcado; o horário anterior foi mantido no histórico.");
    router.refresh();
  }

  async function onCancelar(event: FormEvent<HTMLFormElement>, item: CartaoAgendamento) {
    event.preventDefault();
    setErro(null);
    setSucesso(null);
    setOcupado(item.id);
    const motivo = String(new FormData(event.currentTarget).get("motivo") ?? "");
    const resultado = await cancelarAtendimento({ agendamentoId: item.id, motivo });
    setOcupado(null);
    if (!resultado.ok) {
      setErro(resultado.erro);
      return;
    }
    setAberto(null);
    setSucesso("Atendimento cancelado e registrado no percurso do PTS.");
    router.refresh();
  }

  async function onRegistrar(item: CartaoAgendamento, resultado: "REALIZADO" | "FALTA") {
    setErro(null);
    setSucesso(null);
    setOcupado(item.id);
    const r = await registrarResultadoAtendimento({ agendamentoId: item.id, resultado });
    setOcupado(null);
    if (!r.ok) {
      setErro(r.erro);
      return;
    }
    setSucesso(resultado === "FALTA" ? "Falta registrada nos eventos do PTS." : "Atendimento concluído e registrado nos eventos do PTS.");
    router.refresh();
  }

  const porDia = new Map(dias.map((dia) => [
    dia.civil,
    agenda.agendamentos.filter((a) => diaCivil(a.inicioEm) === dia.civil),
  ]));

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(20rem,0.9fr)]">
      <section aria-label="Atendimentos da semana" className="space-y-4">
        {erro ? <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{erro}</p> : null}
        {sucesso ? <p role="status" className="rounded-xl bg-success/10 p-3 text-sm text-success">{sucesso}</p> : null}
        {dias.map((dia) => {
          const itens = porDia.get(dia.civil) ?? [];
          return (
            <Card key={dia.civil}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base capitalize">{dia.titulo}</CardTitle>
              </CardHeader>
              <CardContent>
                {itens.length === 0 ? (
                  <p className="py-2 text-sm text-muted-foreground">Nenhum atendimento marcado.</p>
                ) : (
                  <ul className="divide-y">
                    {itens.map((item) => {
                      const podeRemarcar = agenda.gerenteAgenda || item.profissionalId === agenda.usuarioId;
                      const podeMarcarResultado = agenda.podeRegistrar && item.profissionalId === agenda.usuarioId && new Date(item.fimEm).getTime() <= Date.now();
                      const podeCancelar = agenda.gerenteAgenda;
                      return (
                        <li key={item.id} className="space-y-3 py-4" data-testid="agenda-atendimento">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-medium">
                                <span className="mr-2 tabular-nums">{hora(item.inicioEm)}–{hora(item.fimEm)}</span>
                                {item.pacienteNome}
                              </p>
                              <p className="mt-1 text-sm text-muted-foreground">
                                {item.profissionalNome}{item.profissionalCategoria ? ` · ${item.profissionalCategoria}` : ""}
                              </p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                <Badge variant={item.status === "AGENDADO" ? "secondary" : "outline"}>{STATUS[item.status]}</Badge>
                                <Badge variant="outline">{SEMAFORO[item.semaforoReuniao] ?? "Semáforo não definido"}</Badge>
                                {item.fila ? <Badge variant="outline">Fila amarela #{item.fila.posicao} · estimativa {item.fila.estimativaDias} dias</Badge> : null}
                              </div>
                              {item.ultimoEvento ? (
                                <p className="mt-2 text-xs text-muted-foreground">
                                  Último evento do PTS: {item.ultimoEvento.tipo.toLowerCase()} · {formatarDataEvento(item.ultimoEvento.data)}
                                </p>
                              ) : null}
                              <Link className="mt-2 inline-block text-xs text-primary underline-offset-4 hover:underline" href={`/casos/${item.ptsId}`}>
                                Abrir PTS
                              </Link>
                            </div>
                            {item.status === "AGENDADO" ? (
                              <div className="flex flex-wrap gap-2">
                                {podeRemarcar ? <Button size="sm" variant="outline" onClick={() => setAberto({ id: item.id, acao: "remarcar" })}>Remarcar</Button> : null}
                                {podeCancelar ? <Button size="sm" variant="outline" className="text-destructive" onClick={() => setAberto({ id: item.id, acao: "cancelar" })}>Cancelar</Button> : null}
                                {podeMarcarResultado ? <>
                                  <Button size="sm" onClick={() => onRegistrar(item, "REALIZADO")} loading={ocupado === item.id}>Realizado</Button>
                                  <Button size="sm" variant="outline" onClick={() => onRegistrar(item, "FALTA")} disabled={ocupado === item.id}>Registrar falta</Button>
                                </> : null}
                              </div>
                            ) : null}
                          </div>
                          {aberto?.id === item.id && aberto.acao === "remarcar" ? (
                            <form className="grid gap-3 rounded-xl bg-muted/50 p-3 sm:grid-cols-[1fr_auto] sm:items-end" onSubmit={(event) => onRemarcar(event, item)}>
                              <div className="grid gap-2">
                                <Label htmlFor={`remarcar-${item.id}`}>Novo horário</Label>
                                <Input id={`remarcar-${item.id}`} name="inicioEm" type="datetime-local" min={dataProximaMeiaHora()} required defaultValue={dateTimeLocal(item.inicioEm)} />
                              </div>
                              <Button type="submit" size="sm" loading={ocupado === item.id}>{ocupado === item.id ? "Salvando…" : "Confirmar remarcação"}</Button>
                            </form>
                          ) : null}
                          {aberto?.id === item.id && aberto.acao === "cancelar" ? (
                            <form className="grid gap-3 rounded-xl bg-muted/50 p-3 sm:grid-cols-[1fr_auto] sm:items-end" onSubmit={(event) => onCancelar(event, item)}>
                              <div className="grid gap-2">
                                <Label htmlFor={`cancelar-${item.id}`}>Motivo do cancelamento</Label>
                                <Input id={`cancelar-${item.id}`} name="motivo" maxLength={500} minLength={3} required />
                              </div>
                              <Button type="submit" size="sm" variant="destructive" loading={ocupado === item.id}>{ocupado === item.id ? "Salvando…" : "Confirmar cancelamento"}</Button>
                            </form>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>
          );
        })}
      </section>

      {agenda.podeAgendar ? (
        <aside>
          <Card className="xl:sticky xl:top-4">
            <CardHeader>
              <CardTitle className="text-base">Agendar atendimento</CardTitle>
              <p className="text-sm text-muted-foreground">O profissional precisa fazer parte da equipe do PTS. Duração padrão ajustável por atendimento.</p>
            </CardHeader>
            <CardContent>
              {agenda.casos.length === 0 ? (
                <p className="text-sm text-muted-foreground">Não há PTS ativo vinculado disponível para agendamento.</p>
              ) : (
                <form className="grid gap-4" onSubmit={onAgendar}>
                  <div className="grid gap-2">
                    <Label htmlFor="ptsId">Paciente / PTS</Label>
                    <select id="ptsId" name="ptsId" value={casoSelecionado} required className={campoNativoClasses} onChange={(event) => setCasoSelecionado(event.target.value)}>
                      {agenda.casos.map((caso) => <option key={caso.ptsId} value={caso.ptsId}>{caso.pacienteNome} · {caso.status.replaceAll("_", " ")}</option>)}
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="profissionalId">Profissional da equipe</Label>
                    <select id="profissionalId" name="profissionalId" required className={campoNativoClasses} defaultValue="">
                      <option value="" disabled>Selecione…</option>
                      {casoAtual?.profissionais.map((profissional) => (
                        <option key={profissional.id} value={profissional.id}>{profissional.nome}{profissional.categoria ? ` · ${profissional.categoria}` : ""}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="inicioEm">Data e horário (Recife)</Label>
                    <Input id="inicioEm" name="inicioEm" type="datetime-local" min={dataInicial} value={dataInicial} required onChange={(event) => setDataInicial(event.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="duracaoMinutos">Duração</Label>
                    <select id="duracaoMinutos" name="duracaoMinutos" defaultValue="30" className={campoNativoClasses}>
                      {[15, 30, 45, 60, 90, 120].map((minutos) => <option key={minutos} value={minutos}>{minutos} minutos</option>)}
                    </select>
                  </div>
                  <p className="text-xs text-muted-foreground">A agenda bloqueia horários sobrepostos e impede marcar atendimentos em PTS encerrados.</p>
                  <Button type="submit" loading={ocupado === "novo"}>{ocupado === "novo" ? "Agendando…" : "Agendar"}</Button>
                </form>
              )}
            </CardContent>
          </Card>
        </aside>
      ) : null}
    </div>
  );
}

function formatarDataEvento(data: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Recife",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(data);
}
