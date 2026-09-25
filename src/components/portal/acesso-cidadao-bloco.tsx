"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Link2, RefreshCw } from "lucide-react";

import { gerarLinkCidadao } from "@/server/care-plan/acesso-cidadao";
import type { InfoAcessoCidadao } from "@/server/care-plan/portal-cidadao-leitura";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

function formatarData(data: Date | null): string {
  if (!data) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(data);
}

export function AcessoCidadaoBloco({
  ptsId,
  info,
}: {
  ptsId: string;
  info: InfoAcessoCidadao;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [linkGerado, setLinkGerado] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  async function gerar() {
    setPending(true);
    setErro(null);
    setCopiado(false);
    const resultado = await gerarLinkCidadao({ ptsId });
    setPending(false);
    if (!resultado.ok) {
      setErro(resultado.erro);
      return;
    }
    setLinkGerado(resultado.link);
    router.refresh();
  }

  async function copiar() {
    if (!linkGerado) return;
    try {
      await navigator.clipboard.writeText(linkGerado);
      setCopiado(true);
    } catch {
      setErro("Não foi possível copiar. Selecione o link e copie manualmente.");
    }
  }

  const existente = info.existe;

  return (
    <Card data-testid="bloco-acesso-cidadao">
      <CardContent className="space-y-3">
        <div className="space-y-0.5">
          <h2 className="text-sm font-medium">Acesso do cidadão</h2>
          <p className="text-xs text-muted-foreground">
            Link para o paciente ou cuidador acompanhar este PTS pelo celular — sem conta e sem
            senha. Você gera aqui e entrega o link; o sistema não envia e-mail.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant={existente ? "outline" : "default"}
            onClick={gerar}
            disabled={pending}
            data-testid="gerar-link-cidadao"
          >
            {existente ? (
              <>
                <RefreshCw aria-hidden className="size-4" />
                {pending ? "Gerando…" : "Gerar novo link"}
              </>
            ) : (
              <>
                <Link2 aria-hidden className="size-4" />
                {pending ? "Gerando…" : "Gerar link de acesso"}
              </>
            )}
          </Button>
          {existente && info.valido && (
            <p className="text-xs text-muted-foreground" data-testid="link-validade">
              Link válido até {formatarData(info.expiraEm)}
            </p>
          )}
        </div>

        {existente && !info.valido && (
          <p className="text-xs text-muted-foreground">
            O link anterior expirou em {formatarData(info.expiraEm)}. Gere um novo para o cidadão.
          </p>
        )}

        {existente && (
          <p className="text-xs text-muted-foreground" data-testid="link-ultimo-acesso">
            {info.totalAcessos === 0
              ? "Ainda não foi acessado."
              : `${info.totalAcessos} acesso(s) — último em ${formatarData(info.ultimoAcessoEm)}`}
          </p>
        )}

        {linkGerado && (
          <div className="space-y-2 rounded-md border border-primary/40 bg-primary/5 p-3">
            <p className="text-sm font-medium">Entregue este link ao paciente ou cuidador</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                readOnly
                value={linkGerado}
                aria-label="Link de acesso do cidadão"
                data-testid="link-gerado"
                className="font-mono text-xs"
                onFocus={(e) => e.currentTarget.select()}
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={copiar}
                className="shrink-0"
              >
                {copiado ? "Copiado" : "Copiar"}
              </Button>
            </div>
            {existente && (
              <p className="text-xs text-muted-foreground">
                O link anterior foi revogado: quem tinha ele não acessa mais.
              </p>
            )}
          </div>
        )}

        {erro && (
          <p role="alert" className="text-sm text-destructive">
            {erro}
          </p>
        )}

        <Alert variant="warning" className="text-xs">
          Quem tiver o link vê o percurso e as metas deste PTS. Entregue somente ao paciente ou
          cuidador e gere um novo link se desconfiar de acesso indevido.
        </Alert>
      </CardContent>
    </Card>
  );
}
