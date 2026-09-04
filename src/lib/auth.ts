import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import type { JWT } from "next-auth/jwt";
import { z } from "zod";
import type { BasePapel, CategoriaProfissional, StatusUsuario } from "@prisma/client";

import { db } from "@/lib/db";
import { verificarSenha } from "@/server/iam/password";
import { authConfig } from "@/auth.config";

const credenciaisSchema = z.object({
  email: z.string().email(),
  senha: z.string().min(1),
});

// Janela de tolerância antes de reconsultar status/papel no banco (plano/17 §4).
const TTL_REVALIDACAO_MS = 45_000;

// Sessão JWT não relê o banco a cada request por padrão — revogação de
// acesso e troca de papel ficariam presas até o token expirar (~30 dias).
// TTL curto força reconsulta periódica sem bater no DB em toda navegação.
export async function revalidarTokenSessao(token: JWT): Promise<JWT> {
  const revalidadoEm =
    typeof token.revalidadoEm === "number" ? token.revalidadoEm : 0;
  if (!token.sub || Date.now() - revalidadoEm < TTL_REVALIDACAO_MS) {
    return token;
  }

  const usuario = await db.usuario.findUnique({
    where: { id: token.sub },
    include: { papel: true },
  });

  if (!usuario) {
    return { ...token, status: "BLOQUEADO" satisfies StatusUsuario, revalidadoEm: Date.now() };
  }

  return {
    ...token,
    papelId: usuario.papelId,
    basePapel: usuario.papel.base,
    nomePapel: usuario.papel.nome,
    status: usuario.status,
    categoria: usuario.categoria,
    cerId: usuario.cerId,
    revalidadoEm: Date.now(),
  };
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "E-mail", type: "email" },
        senha: { label: "Senha", type: "password" },
      },
      async authorize(credenciais) {
        const parsed = credenciaisSchema.safeParse(credenciais);
        if (!parsed.success) return null;

        const usuario = await db.usuario.findUnique({
          where: { email: parsed.data.email },
          include: { papel: true },
        });
        if (!usuario) return null;

        if (usuario.status !== "ATIVO") return null;

        const senhaOk = await verificarSenha(
          parsed.data.senha,
          usuario.senhaHash,
        );
        if (!senhaOk) return null;

        return {
          id: usuario.id,
          email: usuario.email,
          name: usuario.nome,
          papelId: usuario.papelId,
          basePapel: usuario.papel.base,
          nomePapel: usuario.papel.nome,
          status: usuario.status,
          categoria: usuario.categoria,
          cerId: usuario.cerId,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.papelId = user.papelId;
        token.basePapel = user.basePapel;
        token.nomePapel = user.nomePapel;
        token.status = user.status;
        token.categoria = user.categoria;
        token.cerId = user.cerId;
        token.revalidadoEm = Date.now();
        return token;
      }

      return revalidarTokenSessao(token);
    },
    session({ session, token }) {
      session.user.id = token.sub ?? "";
      session.user.nome = token.name ?? "";
      session.user.papelId = token.papelId as string;
      session.user.basePapel = token.basePapel as BasePapel;
      session.user.nomePapel = token.nomePapel as string;
      session.user.status = (token.status as StatusUsuario) ?? "ATIVO";
      session.user.categoria = (token.categoria as
        | CategoriaProfissional
        | null) ?? null;
      session.user.cerId = (token.cerId as string | null) ?? null;
      return session;
    },
  },
});
