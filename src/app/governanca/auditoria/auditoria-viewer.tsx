"use client";

import { useEffect, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  listarAuditoria,
  type EventoAuditoria,
  type FiltroAuditoria,
} from "@/server/governance/auditoria";

type FiltroForm = {
  entityType: string;
  entityId: string;
  actorEmail: string;
  action: string;
  desde: string;
  ate: string;
};

const FILTRO_VAZIO: FiltroForm = {
  entityType: "",
  entityId: "",
  actorEmail: "",
  action: "",
  desde: "",
  ate: "",
};

function paraFiltroAuditoria(f: FiltroForm, cursor?: string): FiltroAuditoria {
  return {
    entityType: f.entityType || undefined,
    entityId: f.entityId || undefined,
    actorEmail: f.actorEmail || undefined,
    action: f.action || undefined,
    desde: f.desde ? new Date(f.desde) : undefined,
    ate: f.ate ? new Date(`${f.ate}T23:59:59`) : undefined,
    cursor,
  };
}

export function AuditoriaViewer({ tiposEntidade }: { tiposEntidade: string[] }) {
  const [filtro, setFiltro] = useState<FiltroForm>(FILTRO_VAZIO);
  const [eventos, setEventos] = useState<EventoAuditoria[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function buscar(f: FiltroForm) {
    setCarregando(true);
    setErro(null);
    try {
      const resultado = await listarAuditoria(paraFiltroAuditoria(f));
      setEventos(resultado.eventos);
      setCursor(resultado.proximoCursor);
    } catch {
      setErro("Erro ao buscar a trilha de auditoria.");
    } finally {
      setCarregando(false);
    }
  }

  async function carregarMais() {
    if (!cursor) return;
    setCarregando(true);
    setErro(null);
    try {
      const resultado = await listarAuditoria(paraFiltroAuditoria(filtro, cursor));
      setEventos((atual) => [...atual, ...resultado.eventos]);
      setCursor(resultado.proximoCursor);
    } catch {
      setErro("Erro ao carregar mais eventos.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    void buscar(FILTRO_VAZIO);
  }, []);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    void buscar(filtro);
  }

  return (
    <div className="flex flex-col gap-6">
      <form
        className="grid gap-3 rounded-lg border p-4 sm:grid-cols-3"
        onSubmit={onSubmit}
      >
        <div className="grid gap-1">
          <Label htmlFor="filtro-entityType">Tipo de entidade</Label>
          <select
            id="filtro-entityType"
            value={filtro.entityType}
            onChange={(e) => setFiltro((f) => ({ ...f, entityType: e.target.value }))}
            className="border-input bg-background flex h-9 w-full rounded-md border px-3 text-sm"
          >
            <option value="">Todos</option>
            {tiposEntidade.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1">
          <Label htmlFor="filtro-entityId">ID da entidade</Label>
          <Input
            id="filtro-entityId"
            value={filtro.entityId}
            onChange={(e) => setFiltro((f) => ({ ...f, entityId: e.target.value }))}
          />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="filtro-actorEmail">E-mail do autor</Label>
          <Input
            id="filtro-actorEmail"
            value={filtro.actorEmail}
            onChange={(e) => setFiltro((f) => ({ ...f, actorEmail: e.target.value }))}
          />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="filtro-action">Ação</Label>
          <Input
            id="filtro-action"
            placeholder="ex.: pts.transicionar"
            value={filtro.action}
            onChange={(e) => setFiltro((f) => ({ ...f, action: e.target.value }))}
          />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="filtro-desde">Desde</Label>
          <Input
            id="filtro-desde"
            type="date"
            value={filtro.desde}
            onChange={(e) => setFiltro((f) => ({ ...f, desde: e.target.value }))}
          />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="filtro-ate">Até</Label>
          <Input
            id="filtro-ate"
            type="date"
            value={filtro.ate}
            onChange={(e) => setFiltro((f) => ({ ...f, ate: e.target.value }))}
          />
        </div>
        <Button type="submit" disabled={carregando} className="justify-self-start sm:col-span-3">
          {carregando ? "Buscando…" : "Buscar"}
        </Button>
      </form>

      {erro ? (
        <p role="alert" className="text-sm text-destructive">
          {erro}
        </p>
      ) : null}

      {eventos.length === 0 && !carregando ? (
        <p className="text-sm text-muted-foreground">Nenhum evento encontrado.</p>
      ) : (
        <ul className="divide-y rounded-md border" data-testid="lista-auditoria">
          {eventos.map((ev) => (
            <li key={ev.id} className="p-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium">{ev.action}</span>
                <time className="text-xs text-muted-foreground">
                  {ev.criadaEm.toLocaleString("pt-BR")}
                </time>
              </div>
              <p className="text-xs text-muted-foreground">
                {ev.actorNome} ({ev.actorEmail}) · {ev.entityType}/{ev.entityId}
              </p>
              {ev.motivo ? <p className="mt-1">Motivo: {ev.motivo}</p> : null}
              {ev.beforeResumo ? (
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  Antes: {ev.beforeResumo}
                </p>
              ) : null}
              {ev.afterResumo ? (
                <p className="truncate text-xs text-muted-foreground">
                  Depois: {ev.afterResumo}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {cursor ? (
        <Button
          type="button"
          variant="outline"
          onClick={carregarMais}
          disabled={carregando}
          className="justify-self-start"
        >
          {carregando ? "Carregando…" : "Carregar mais"}
        </Button>
      ) : null}
    </div>
  );
}
