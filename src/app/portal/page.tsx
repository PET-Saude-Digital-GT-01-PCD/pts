import Link from "next/link";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { lerSessaoPortal } from "@/server/portal/sessao";
import { sairDoPortal } from "@/server/portal/acoes";

// Entrada do cidadão no portal (#73, ADR-0012): formulário GET sem JS →
// /api/portal/entrar troca o código pelo cookie de sessão. O código impresso
// na recepção (ou aberto pelo QR que já traz ?acesso=) é o único segredo.

export default async function PortalEntradaPage({
  searchParams,
}: {
  searchParams: Promise<{ acesso?: string; pts?: string; erro?: string }>;
}) {
  const { acesso, pts, erro } = await searchParams;

  // Link/QR já traz o código: entre direto sem exigir um clique.
  if (acesso) {
    const destino = new URLSearchParams({ acesso });
    if (pts) destino.set("pts", pts);
    redirect(`/api/portal/entrar?${destino.toString()}`);
  }

  const sessao = await lerSessaoPortal();
  const ptsAtivo = sessao
    ? await db.pts.findFirst({
        where: { pacienteId: sessao.pacienteId },
        orderBy: { criadoEm: "desc" },
        select: { id: true },
      })
    : null;

  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 p-6 sm:p-8">
      <div>
        <h1 className="text-2xl font-semibold">Portal do cidadão</h1>
        <p className="mt-1 text-muted-foreground">
          Digite o código de acesso que você recebeu na recepção para ver o seu
          percurso de cuidado.
        </p>
      </div>

      {sessao && ptsAtivo ? (
        <p
          data-testid="portal-ja-conectado"
          className="rounded-lg border border-success/40 bg-success/10 px-3 py-2 text-sm text-success"
        >
          Você já está conectado.{" "}
          <Link className="underline" href={`/portal/${ptsAtivo.id}`}>
            Ver meu percurso
          </Link>
        </p>
      ) : null}

      {sessao && !ptsAtivo ? (
        <div
          data-testid="portal-aguardando"
          className="rounded-lg border bg-muted/40 px-3 py-3 text-sm"
        >
          <p className="font-medium">Recebemos o seu acesso.</p>
          <p className="mt-1 text-muted-foreground">
            Seu cadastro está com a equipe do CER. Assim que o seu caso for
            aberto, você acompanha aqui os passos do cuidado e o que foi
            combinado com a equipe. Precisa de ajuda? Fale com a recepção.
          </p>
        </div>
      ) : null}

      {erro ? (
        <p
          role="alert"
          data-testid="erro-portal"
          className="text-destructive rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm font-medium"
        >
          Código inválido ou expirado. Confira o código com a equipe.
        </p>
      ) : null}

      {!sessao ? (
        <>
          <form
            action="/api/portal/entrar"
            method="get"
            className="flex flex-col gap-3"
          >
            {pts ? <input type="hidden" name="pts" value={pts} /> : null}
            <div className="grid gap-1">
              <Label htmlFor="acesso">Código de acesso</Label>
              <Input
                id="acesso"
                name="acesso"
                defaultValue={acesso ?? ""}
                autoComplete="one-time-code"
                autoCapitalize="characters"
                spellCheck={false}
                required
                className="text-center text-lg tracking-widest"
              />
            </div>
            <Button type="submit">Entrar</Button>
          </form>

          <p className="text-xs text-muted-foreground">
            Não tem o código? Peça na recepção do CER. Ele é válido por tempo
            limitado e pode ser cancelado a qualquer momento pela equipe.
          </p>
        </>
      ) : null}

      {sessao ? (
        <form action={sairDoPortal} className="border-t pt-4">
          <Button type="submit" variant="outline" size="sm">
            Sair do portal
          </Button>
          <p className="mt-2 text-xs text-muted-foreground">
            Saia ao usar um aparelho compartilhado.
          </p>
        </form>
      ) : null}
    </main>
  );
}
