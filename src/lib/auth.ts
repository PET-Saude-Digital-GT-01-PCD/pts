import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import type { CategoriaProfissional, Papel } from "@prisma/client";

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
        });
        if (!usuario) return null;

        const senhaOk = await verificarSenha(
          parsed.data.senha,
          usuario.senhaHash,
        );
        if (!senhaOk) return null;

        return {
          id: usuario.id,
          email: usuario.email,
          name: usuario.nome,
          papel: usuario.papel,
          categoria: usuario.categoria,
          cerId: usuario.cerId,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.papel = user.papel;
        token.categoria = user.categoria;
        token.cerId = user.cerId;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.sub ?? "";
      session.user.nome = token.name ?? "";
      session.user.papel = token.papel as Papel;
      session.user.categoria = (token.categoria as
        | CategoriaProfissional
        | null) ?? null;
      session.user.cerId = (token.cerId as string | null) ?? null;
      return session;
    },
  },
});