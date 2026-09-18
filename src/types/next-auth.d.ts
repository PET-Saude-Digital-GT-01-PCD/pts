import type {
  BasePapel,
  CategoriaProfissional,
  StatusUsuario,
} from "@prisma/client";
import type { DefaultSession } from "next-auth";

/** Dados do usuário simulado, guardados à parte dos dados do ator real. */
export type ImpersonacaoToken = {
  usuarioId: string;
  nome: string;
  email: string;
  papelId: string;
  basePapel: BasePapel;
  nomePapel: string;
  status: StatusUsuario;
  categoria: CategoriaProfissional | null;
  cerId: string | null;
};

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
    /** id do admin real, mesmo durante impersonação */
    atorRealId: string;
    impersonando: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    atorRealId?: string;
    impersonando?: ImpersonacaoToken | null;
  }
}
