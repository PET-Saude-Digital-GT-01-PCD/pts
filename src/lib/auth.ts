import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import type { BasePapel, CategoriaProfissional, StatusUsuario } from "@prisma/client";

import { db } from "@/lib/db";
import { verificarSenha } from "@/server/iam/password";
import { authConfig } from "@/auth.config";

const credenciaisSchema = z.object({
  email: z.string().email(),
  senha: z.string().min(1),
});

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
    jwt({ token, user }) {
      if (user) {
        token.papelId = user.papelId;
        token.basePapel = user.basePapel;
        token.nomePapel = user.nomePapel;
        token.status = user.status;
        token.categoria = user.categoria;
        token.cerId = user.cerId;
      }
      return token;
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
