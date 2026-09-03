"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma, type CategoriaProfissional } from "@prisma/client";

import { db } from "@/lib/db";
import { requirePermissao } from "@/server/iam/session";
import { hashSenha } from "@/server/iam/password";
import {
  validarCamposDinamicos,
  type CampoFormularioConfig,
} from "@/server/iam/formulario-config";

type Resultado = { ok: true } | { ok: false; erro: string };

// ponytail: deploy-per-org (ADR-0010) — um único CER por instância. Rota
// pública /cadastro não tem sessão para resolver o CER, então usa o único
// registrado. Multi-instância real precisará de outro mecanismo de resolução.
async function buscarCerUnico() {
  return db.cer.findFirst({ select: { id: true, papelAutocadastroId: true } });
}

export type FormularioCadastro = {
  disponivel: boolean;
  campos: CampoFormularioConfig[];
};

export async function buscarFormularioCadastro(): Promise<FormularioCadastro> {
  const cer = await buscarCerUnico();
  if (!cer || !cer.papelAutocadastroId) return { disponivel: false, campos: [] };

  const configs = await db.formularioConfig.findMany({
    where: { cerId: cer.id, entidade: "usuario", visivel: true },
    orderBy: { ordem: "asc" },
    select: { campo: true, rotulo: true, tipo: true, obrigatorio: true, opcoesJson: true },
  });

  return {
    disponivel: true,
    campos: configs.map((c) => ({
      campo: c.campo,
      rotulo: c.rotulo,
      tipo: c.tipo,
      obrigatorio: c.obrigatorio,
      opcoes: Array.isArray(c.opcoesJson) ? (c.opcoesJson as string[]) : null,
    })),
  };
}

const categoriaSchema = z.enum([
  "RECEPCAO",
  "TRIADOR",
  "MEDICO",
  "FISIOTERAPEUTA",
  "TERAPEUTA_OCUPACIONAL",
  "PSICOLOGO",
  "ENFERMEIRO",
]);

const autoCadastroSchema = z.object({
  nome: z.string().trim().min(3, "Nome muito curto.").max(120),
  email: z.string().trim().email("E-mail inválido."),
  senha: z.string().min(8, "Senha deve ter ao menos 8 caracteres."),
  categoria: categoriaSchema,
  camposDinamicos: z.record(z.unknown()).optional(),
});

export async function autoCadastrar(input: unknown): Promise<Resultado> {
  const parsed = autoCadastroSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, erro: parsed.error.issues[0].message };
  }
  const dados = parsed.data;

  const cer = await buscarCerUnico();
  if (!cer || !cer.papelAutocadastroId) {
    return { ok: false, erro: "Auto-cadastro não está disponível no momento." };
  }

  const configs = await db.formularioConfig.findMany({
    where: { cerId: cer.id, entidade: "usuario", visivel: true },
    select: { campo: true, rotulo: true, tipo: true, obrigatorio: true, opcoesJson: true },
  });
  const campos: CampoFormularioConfig[] = configs.map((c) => ({
    campo: c.campo,
    rotulo: c.rotulo,
    tipo: c.tipo,
    obrigatorio: c.obrigatorio,
    opcoes: Array.isArray(c.opcoesJson) ? (c.opcoesJson as string[]) : null,
  }));

  const validacao = validarCamposDinamicos(campos, dados.camposDinamicos ?? {});
  if (!validacao.ok) return { ok: false, erro: validacao.erro };

  const existente = await db.usuario.findUnique({ where: { email: dados.email } });
  if (existente) return { ok: false, erro: "Já existe cadastro com este e-mail." };

  const senhaHash = await hashSenha(dados.senha);

  try {
    await db.$transaction(async (tx) => {
      const usuario = await tx.usuario.create({
        data: {
          cerId: cer.id,
          email: dados.email,
          senhaHash,
          nome: dados.nome,
          categoria: dados.categoria as CategoriaProfissional,
          papelId: cer.papelAutocadastroId!,
          status: "PENDENTE",
          camposDinamicosJson:
            Object.keys(validacao.dados).length > 0
              ? (validacao.dados as Prisma.InputJsonValue)
              : undefined,
        },
      });

      await tx.auditoria.create({
        data: {
          actorId: usuario.id,
          action: "usuario.autocadastro",
          entityType: "usuario",
          entityId: usuario.id,
          afterJson: { nome: usuario.nome, email: usuario.email, categoria: usuario.categoria },
        },
      });
    });

    return { ok: true };
  } catch (erro) {
    // ponytail: corrida entre checagem e create cai no unique do banco
    if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2002") {
      return { ok: false, erro: "Já existe cadastro com este e-mail." };
    }
    throw erro;
  }
}

export type UsuarioPendente = {
  id: string;
  nome: string;
  email: string;
  categoria: string;
  criadoEm: Date;
  camposDinamicosJson: unknown;
};

export async function listarPendentes(): Promise<UsuarioPendente[]> {
  const user = await requirePermissao("admin.usuarios.aprovar");
  return db.usuario.findMany({
    where: { cerId: user.cerId ?? undefined, status: "PENDENTE" },
    orderBy: { criadoEm: "asc" },
    select: {
      id: true,
      nome: true,
      email: true,
      categoria: true,
      criadoEm: true,
      camposDinamicosJson: true,
    },
  });
}

export async function aprovarUsuario(usuarioId: string): Promise<Resultado> {
  const admin = await requirePermissao("admin.usuarios.aprovar");

  const usuario = await db.usuario.findUnique({ where: { id: usuarioId } });
  if (!usuario) return { ok: false, erro: "Usuário não encontrado." };
  if (usuario.status !== "PENDENTE") {
    return { ok: false, erro: "Usuário não está pendente de aprovação." };
  }

  await db.$transaction(async (tx) => {
    await tx.usuario.update({ where: { id: usuarioId }, data: { status: "ATIVO" } });
    await tx.auditoria.create({
      data: {
        actorId: admin.id,
        action: "usuario.aprovar",
        entityType: "usuario",
        entityId: usuarioId,
        beforeJson: { status: usuario.status },
        afterJson: { status: "ATIVO" },
      },
    });
  });

  revalidatePath("/dashboard/usuarios");
  return { ok: true };
}

const rejeicaoSchema = z.object({
  motivo: z.string().trim().min(1, "Informe o motivo da rejeição."),
});

export async function rejeitarUsuario(usuarioId: string, input: unknown): Promise<Resultado> {
  const admin = await requirePermissao("admin.usuarios.aprovar");

  const parsed = rejeicaoSchema.safeParse(input);
  if (!parsed.success) return { ok: false, erro: parsed.error.issues[0].message };

  const usuario = await db.usuario.findUnique({ where: { id: usuarioId } });
  if (!usuario) return { ok: false, erro: "Usuário não encontrado." };
  if (usuario.status !== "PENDENTE") {
    return { ok: false, erro: "Usuário não está pendente de aprovação." };
  }

  await db.$transaction(async (tx) => {
    await tx.usuario.update({ where: { id: usuarioId }, data: { status: "BLOQUEADO" } });
    await tx.auditoria.create({
      data: {
        actorId: admin.id,
        action: "usuario.rejeitar",
        entityType: "usuario",
        entityId: usuarioId,
        beforeJson: { status: usuario.status },
        afterJson: { status: "BLOQUEADO" },
        motivo: parsed.data.motivo,
      },
    });
  });

  revalidatePath("/dashboard/usuarios");
  return { ok: true };
}
