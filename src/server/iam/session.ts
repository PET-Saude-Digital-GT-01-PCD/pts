import { redirect } from "next/navigation";
import type { BasePapel, CategoriaProfissional, StatusUsuario } from "@prisma/client";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export type SessaoUsuario = {
  id: string;
  nome: string;
  email: string;
  papelId: string;
  basePapel: BasePapel;
  nomePapel: string;
  status: StatusUsuario;
  categoria: CategoriaProfissional | null;
  cerId: string | null;
};

export async function getCurrentUser(): Promise<SessaoUsuario | null> {
  const session = await auth();
  if (!session?.user || !session.user.papelId) return null;
  // Reforço: mesmo que o token ainda não tenha sido revalidado (ver jwt()
  // em src/lib/auth.ts), nunca trata como logado um status não-ATIVO.
  if (session.user.status !== "ATIVO") return null;
  return {
    id: session.user.id,
    nome: session.user.nome,
    email: session.user.email ?? "",
    papelId: session.user.papelId,
    basePapel: session.user.basePapel,
    nomePapel: session.user.nomePapel,
    status: session.user.status,
    categoria: session.user.categoria,
    cerId: session.user.cerId,
  };
}

export async function requireAuth(): Promise<SessaoUsuario> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function recursosDoUsuario(papelId: string): Promise<string[]> {
  if (!papelId) return [];
  const papel = await db.papel.findUnique({
    where: { id: papelId },
    select: { recursos: { select: { recurso: { select: { chave: true } } } } },
  });
  if (!papel) return [];
  return papel.recursos.map((pr) => pr.recurso.chave);
}

/**
 * Junta usuário + recursos em uma chamada, pra o caller (AppShell) poder
 * rodar em paralelo com outras queries da navegação (ex.: org config) em vez
 * de esperar getCurrentUser() terminar pra só então buscar os recursos.
 */
export async function getSessaoComRecursos(): Promise<{
  user: SessaoUsuario | null;
  recursos: string[];
}> {
  const user = await getCurrentUser();
  if (!user) return { user: null, recursos: [] };
  const recursos = await recursosDoUsuario(user.papelId);
  return { user, recursos };
}

export async function requirePermissao(...chaves: string[]): Promise<SessaoUsuario> {
  const user = await requireAuth();
  const recursos = await recursosDoUsuario(user.papelId);
  const possuiTodas = chaves.every((chave) => recursos.includes(chave));
  if (!possuiTodas) redirect("/");
  return user;
}

/**
 * Identidade do admin real, mesmo durante uma simulação de perfil (quando
 * getCurrentUser()/requirePermissao() já refletem o usuário simulado).
 */
export async function getAtorReal(): Promise<{
  atorRealId: string;
  impersonando: boolean;
  usuarioSimuladoId: string | null;
}> {
  const session = await auth();
  return {
    atorRealId: session?.atorRealId ?? "",
    impersonando: session?.impersonando ?? false,
    usuarioSimuladoId: session?.impersonando ? session.user?.id ?? null : null,
  };
}
