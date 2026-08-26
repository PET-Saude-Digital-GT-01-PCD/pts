import { redirect } from "next/navigation";

import { requireAuth, recursosDoUsuario } from "@/server/iam/session";

// OR de permissões (requirePermissao é AND). ponytail: helper local enquanto
// só o care-plan usa; extrair p/ session.ts quando um 2º contexto precisar.
export async function temUmaDas(chaves: string[]): Promise<boolean> {
  const user = await requireAuth();
  const recursos = await recursosDoUsuario(user.papelId);
  return chaves.some((chave) => recursos.includes(chave));
}

export async function exigirUmaDas(chaves: string[]) {
  if (!(await temUmaDas(chaves))) {
    throw new Error("Sem permissão para esta ação.");
  }
  return requireAuth();
}

export async function exigirUmaDasOuRedirect(chaves: string[]) {
  if (!(await temUmaDas(chaves))) redirect("/");
  return requireAuth();
}
