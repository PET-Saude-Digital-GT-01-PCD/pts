import { CalendarClock } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";
import type { ItemTimeline } from "@/server/care-plan/painel";

const CLASSE_MARCADOR: Record<string, string> = {
  FALTA: "bg-destructive",
  EVENTO: "bg-primary",
  AVALIACAO: "bg-brand-light",
  META: "bg-success",
  REVISAO: "bg-warning",
  TRIAGEM: "bg-muted-foreground",
};

function marcador(item: ItemTimeline) {
  const chave = item.detalhe?.includes("FALTA") || item.titulo.includes("FALTA")
    ? "FALTA"
    : item.tipo.toUpperCase();
  return CLASSE_MARCADOR[chave] ?? "bg-muted-foreground";
}

/**
 * Linha do tempo do caso, em painel com rolagem própria: a lista corrida
 * empurrava as abas do PTS para o fim da página.
 * ponytail: rola tudo; vira paginação se o histórico ficar grande demais.
 */
export function TimelineCaso({ itens }: { itens: ItemTimeline[] }) {
  if (itens.length === 0) {
    return (
      <EmptyState
        icon={CalendarClock}
        titulo="Nenhum evento registrado"
        descricao="Sessões, faltas e cancelamentos aparecem aqui."
      />
    );
  }

  return (
    <ol
      className="relative max-h-[28rem] space-y-3 overflow-y-auto border-l border-border pr-1 pl-4"
      tabIndex={0}
      aria-label="Eventos do caso, do mais recente ao mais antigo"
    >
      {itens.map((item, i) => (
        <li key={`${item.tipo}-${i}`} className="relative text-sm">
          <span
            aria-hidden
            className={`absolute top-1.5 -left-[21px] size-2 rounded-full ring-2 ring-background ${marcador(item)}`}
          />
          <time
            dateTime={item.data.toISOString()}
            className="block text-xs tabular-nums text-muted-foreground"
          >
            {item.data.toLocaleDateString("pt-BR")}
          </time>
          <p className="font-medium">{item.titulo}</p>
          {item.detalhe && (
            <p className="text-xs text-muted-foreground">{item.detalhe}</p>
          )}
        </li>
      ))}
    </ol>
  );
}
