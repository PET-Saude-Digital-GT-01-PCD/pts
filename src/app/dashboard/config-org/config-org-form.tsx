"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/ui/logo";
import { atualizarOrgConfig } from "@/server/iam/org-config";
import type { OrgConfigView, Parceiro } from "@/server/iam/org-config-schema";

const PARCEIRO_VAZIO: Parceiro = { nome: "", logoUrl: "" };

export function ConfigOrgForm({ orgConfig }: { orgConfig: OrgConfigView }) {
  const router = useRouter();
  const [nomeExibido, setNomeExibido] = useState(orgConfig.nomeExibido);
  const [logoUrl, setLogoUrl] = useState(orgConfig.logoUrl ?? "");
  const [parceiros, setParceiros] = useState<Parceiro[]>(
    orgConfig.parceiros.length > 0 ? orgConfig.parceiros : [{ ...PARCEIRO_VAZIO }],
  );
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [salvando, setSalvando] = useState(false);

  function atualizarParceiro(i: number, campo: keyof Parceiro, valor: string) {
    setParceiros((ps) => ps.map((p, j) => (j === i ? { ...p, [campo]: valor } : p)));
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    setOk(false);
    setSalvando(true);

    const parceirosPreenchidos = parceiros.filter(
      (p) => p.nome.trim() !== "" || p.logoUrl.trim() !== "",
    );

    const resultado = await atualizarOrgConfig({
      nomeExibido,
      logoUrl,
      parceiros: parceirosPreenchidos,
    });
    setSalvando(false);

    if (!resultado.ok) {
      setErro(resultado.erro);
      return;
    }
    setOk(true);
    router.refresh();
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form className="grid gap-6" onSubmit={onSubmit}>
          <div className="flex items-center gap-4 rounded-md border p-4">
            <Logo
              nome={nomeExibido || "PTS Digital"}
              logoUrl={logoUrl.trim() || null}
              size="lg"
            />
            <p className="text-xs text-muted-foreground">Pré-visualização</p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="nomeExibido">Nome exibido</Label>
            <Input
              id="nomeExibido"
              value={nomeExibido}
              onChange={(e) => setNomeExibido(e.target.value)}
              required
              maxLength={120}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="logoUrl">URL do logo (opcional)</Label>
            <Input
              id="logoUrl"
              type="url"
              placeholder="https://…"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
            />
          </div>

          <fieldset className="grid gap-3 rounded-lg border p-4">
            <legend className="px-1 text-sm font-medium">
              Parceiros (rodapé da página inicial)
            </legend>
            {parceiros.map((p, i) => (
              <div key={i} className="grid gap-2 rounded-md border p-3 sm:grid-cols-2">
                <div className="grid gap-1">
                  <Label htmlFor={`parceiro-nome-${i}`}>Nome</Label>
                  <Input
                    id={`parceiro-nome-${i}`}
                    value={p.nome}
                    onChange={(e) => atualizarParceiro(i, "nome", e.target.value)}
                  />
                </div>
                <div className="grid gap-1">
                  <Label htmlFor={`parceiro-logo-${i}`}>URL do logo</Label>
                  <Input
                    id={`parceiro-logo-${i}`}
                    type="url"
                    placeholder="https://…"
                    value={p.logoUrl}
                    onChange={(e) => atualizarParceiro(i, "logoUrl", e.target.value)}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="justify-self-start sm:col-span-2"
                  onClick={() => setParceiros((ps) => ps.filter((_, j) => j !== i))}
                  disabled={parceiros.length === 1}
                >
                  Remover parceiro
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              className="justify-self-start"
              onClick={() => setParceiros((ps) => [...ps, { ...PARCEIRO_VAZIO }])}
            >
              Adicionar parceiro
            </Button>
          </fieldset>

          {erro ? (
            <p role="alert" className="text-sm text-destructive">
              {erro}
            </p>
          ) : null}
          {ok ? (
            <p role="status" data-testid="config-org-ok" className="text-sm text-emerald-600">
              Configurações salvas.
            </p>
          ) : null}

          <Button type="submit" disabled={salvando} className="justify-self-start">
            {salvando ? "Salvando…" : "Salvar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
