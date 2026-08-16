import type { CategoriaProfissional, Papel } from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    papel?: Papel;
    categoria?: CategoriaProfissional | null;
    cerId?: string | null;
  }

  interface Session {
    user: {
      id: string;
      nome: string;
      papel: Papel;
      categoria: CategoriaProfissional | null;
      cerId: string | null;
    } & DefaultSession["user"];
  }
}