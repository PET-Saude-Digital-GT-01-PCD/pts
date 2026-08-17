import type {
  BasePapel,
  CategoriaProfissional,
  StatusUsuario,
} from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    papelId?: string;
    basePapel?: BasePapel;
    nomePapel?: string;
    status?: StatusUsuario;
    categoria?: CategoriaProfissional | null;
    cerId?: string | null;
  }

  interface Session {
    user: {
      id: string;
      nome: string;
      papelId: string;
      basePapel: BasePapel;
      nomePapel: string;
      status: StatusUsuario;
      categoria: CategoriaProfissional | null;
      cerId: string | null;
    } & DefaultSession["user"];
  }
}
