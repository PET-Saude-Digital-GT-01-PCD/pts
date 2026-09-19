import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import type { JWT } from "next-auth/jwt";
import { z } from "zod";
import type { BasePapel, CategoriaProfissional, StatusUsuario } from "@prisma/client";

import { db } from "@/lib/db";
import { verificarSenha } from "@/server/iam/password";
import { podeImpersonar } from "@/server/iam/permissoes";
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
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.atorRealId = user.id;
        token.papelId = user.papelId;
        token.basePapel = user.basePapel;
        token.nomePapel = user.nomePapel;
        token.status = user.status;
        token.categoria = user.categoria;
        token.cerId = user.cerId;
        token.revalidadoEm = Date.now();
        return token;
      }

      // session.update({ impersonarId }) dispara este trigger — nunca confiar
      // só na server action: revalida o alvo e os guardrails aqui de novo.
      if (trigger === "update" && session?.impersonarId && token.atorRealId) {
        const alvo = await db.usuario.findUnique({
          where: { id: session.impersonarId as string },
          include: { papel: true },
        });
        if (alvo) {
          const check = podeImpersonar(token.atorRealId, {
            id: alvo.id,
            basePapel: alvo.papel.base,
            status: alvo.status,
          });
          if (check.ok) {
            token.impersonando = {
              usuarioId: alvo.id,
              nome: alvo.nome,
              email: alvo.email,
              papelId: alvo.papelId,
              basePapel: alvo.papel.base,
              nomePapel: alvo.papel.nome,
              status: alvo.status,
              categoria: alvo.categoria,
              cerId: alvo.cerId,
            };
          }
        }
        return token;
      }

      if (trigger === "update" && session?.pararImpersonacao) {
        token.impersonando = null;
        return token;
      }

      return revalidarTokenSessao(token);
    },
    session({ session, token }) {
      const impersonando = token.impersonando ?? null;
      session.user.id = impersonando?.usuarioId ?? token.sub ?? "";
      session.user.nome = impersonando?.nome ?? token.name ?? "";
      session.user.papelId = (impersonando?.papelId ?? token.papelId) as string;
      session.user.basePapel = (impersonando?.basePapel ??
        token.basePapel) as BasePapel;
      session.user.nomePapel = (impersonando?.nomePapel ??
        token.nomePapel) as string;
      session.user.status = (impersonando?.status ??
        token.status ??
        "ATIVO") as StatusUsuario;
      session.user.categoria = (impersonando?.categoria ??
        (token.categoria as CategoriaProfissional | null) ??
        null);
      session.user.cerId = impersonando?.cerId ?? (token.cerId as string | null) ?? null;
      session.atorRealId = token.atorRealId ?? token.sub ?? "";
      session.impersonando = impersonando !== null;
      return session;
    },
  },
});
