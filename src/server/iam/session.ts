import { redirect } from "next/navigation";
import type { Papel } from "@prisma/client";

import { auth } from "@/lib/auth";

export type SessaoUsuario = {
  id: string;
  nome: string;
  email: string;
  papel: Papel;
  categoria: import("@prisma/client").CategoriaProfissional | null;
  cerId: string | null;
};

export async function getCurrentUser(): Promise<SessaoUsuario | null> {
  const session = await auth();
  if (!session?.user) return null;
  return {
    id: session.user.id,
    nome: session.user.nome,
    email: session.user.email ?? "",
    papel: session.user.papel,
    categoria: session.user.categoria,
    cerId: session.user.cerId,
  };
}

export async function requireAuth(): Promise<SessaoUsuario> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requirePapel(...papeis: Papel[]): Promise<SessaoUsuario> {
  const user = await requireAuth();
  if (!papeis.includes(user.papel)) redirect("/");
  return user;
}