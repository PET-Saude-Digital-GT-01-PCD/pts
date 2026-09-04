"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import type { CategoriaProfissional } from "@prisma/client";

import { db } from "@/lib/db";

type Resultado = { ok: boolean; erro?: string };

const CAMPOS_SISTEMA = new Set(["nome", "email", "senha", "categoria"]);

/** Valida e processa o autocadastro público (sem autenticação). */
export async function autocadastrar(
  cerId: string,
  payload: Record<string, string>,
): Promise<Resultado> {
  // 1. Busca campos configurados para a entidade "usuario" do CER
  const configCampos = await db.formularioConfig.findMany({
    where: { cerId, entidade: "usuario", visivel: true },
    orderBy: { ordem: "asc" },
  });

  if (configCampos.length === 0) {
    return { ok: false, erro: "Formulário de cadastro não configurado para este CER." };
  }

  // 2. Valida campos obrigatórios presentes no payload
  const violacoes: string[] = [];
  for (const c of configCampos) {
    if (c.obrigatorio && !payload[c.campo]?.trim()) {
      violacoes.push(`O campo "${c.rotulo}" é obrigatório.`);
    }
  }
  if (violacoes.length > 0) {
    return { ok: false, erro: violacoes.join(" ") };
  }

  // 3. Valida email único
  const emailSchema = z.string().email();
  const emailNormalized = payload.email.trim().toLowerCase();
  const emailParsed = emailSchema.safeParse(emailNormalized);
  if (!emailParsed.success) {
    return { ok: false, erro: "E-mail inválido." };
  }

  const emailExiste = await db.usuario.findUnique({
    where: { email: emailParsed.data },
    select: { id: true },
  });
  if (emailExiste) {
    return { ok: false, erro: "Este e-mail já está cadastrado." };
  }

  // 4. Valida senha mínima
  if (!payload.senha || payload.senha.length < 6) {
    return { ok: false, erro: "A senha deve ter no mínimo 6 caracteres." };
  }
  // ponytail: teto = rate-limit por IP + CAPTCHA por sessão; upgrade = integrar
  // provedor (ex.: reCAPTCHA ou Turnstile) em middleware global quando houver tráfego
  // maior. Por ora, o fluxo livre serve para piloto controlado.
  const papelPadrao = await db.papel.findFirst({
    where: { cerId, ativo: true, base: { not: "ADMIN" } },
    orderBy: { nome: "asc" },
  });
  // ponytail: papel padrão = primeira heurística (por nome); upgrade = org configurar papel padrão no formulario_config / org_config
  if (!papelPadrao) {
    return { ok: false, erro: "Nenhum papel configurado para este CER. Contate o administrador." };
  }

  // 6. Separa campos dinâmicos extras (não são colunas diretas)
  const camposDinamicos: Record<string, string> = {};
  for (const c of configCampos) {
    if (!CAMPOS_SISTEMA.has(c.campo) && payload[c.campo]) {
      camposDinamicos[c.campo] = payload[c.campo];
    }
  }

  // 7. Mapeia categoria se fornecida
  const categoriaValida = [
    "RECEPCAO",
    "TRIADOR",
    "MEDICO",
    "FISIOTERAPEUTA",
    "TERAPEUTA_OCUPACIONAL",
    "PSICOLOGO",
    "ENFERMEIRO",
  ] as const;

  const categoriaRaw = payload.categoria ?? "";
  if (
    !categoriaValida.includes(
      (payload.categoria || "").toUpperCase() as (typeof categoriaValida)[number],
    )
  ) {
    return {
      ok: false,
      erro: `Categoria inválida. As opções são: ${categoriaValida.join(", ")}.`,
    };
  }
  const categoria = payload.categoria as (typeof categoriaValida)[number];

  // 8. Hash da senha + criação do usuário PENDENTE em transação atômica
  const senhaHash = await bcrypt.hash(payload.senha, 10);

  try {
    await db.$transaction(async (tx) => {
      const novoUsuario = await tx.usuario.create({
        data: {
          cerId,
          email: emailNormalized,
          senhaHash,
          nome: payload.nome.trim(),
          categoria: categoria ?? null,
          papelId: papelPadrao.id,
          status: "PENDENTE",
          camposDinamicosJson:
            Object.keys(camposDinamicos).length > 0 ? camposDinamicos : undefined,
        },
      });

      // Auditoria append-only (ADR-0005)
      await tx.auditoria.create({
        data: {
          actorId: novoUsuario.id,
          action: "usuario.autocadastro",
          entityType: "usuario",
          entityId: novoUsuario.id,
          afterJson: {
            email: emailParsed.data,
            nome: payload.nome.trim(),
            status: "PENDENTE",
            cerId,
          },
        },
      });
    });

    return { ok: true };
  } catch {
    return { ok: false, erro: "Erro ao processar o cadastro. Tente novamente." };
  }
}
