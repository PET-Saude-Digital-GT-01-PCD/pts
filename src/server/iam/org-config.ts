"use server";

import { cache } from "react";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import { requirePermissao } from "@/server/iam/session";
import { buscarCerUnico } from "@/server/shared/tenant";
import { causaDaFalhaDeBanco } from "@/server/shared/db-health";
import {
  orgConfigInputSchema,
  resolverOrgConfig,
  type OrgConfigView,
} from "@/server/iam/org-config-schema";

/**
 * Leitura pública (sem sessão): usada no layout raiz, header e rodapé.
 * `cache()` dedupe as chamadas de generateMetadata + AppShell dentro da
 * mesma navegação — sem isso são 2 queries Prisma idênticas por request.
 *
 * Banco fora do ar cai no padrão em vez de propagar: isto é branding, e o
 * layout raiz roda em toda rota — um throw aqui derruba até a landing e o
 * /login, que não dependem de banco, e o usuário só vê "Application error".
 * Quem responde pela saúde do banco é /api/health.
 */
export const buscarOrgConfigView = cache(async (): Promise<OrgConfigView> => {
  try {
    const cer = await buscarCerUnico();
    if (!cer) return resolverOrgConfig(null);

    const config = await db.orgConfig.findUnique({
      where: { cerId: cer.id },
      select: { nomeExibido: true, logoUrl: true, parceirosJson: true },
    });
    return resolverOrgConfig(config);
  } catch (erro) {
    console.error(
      `[org-config] banco indisponível, usando branding padrão: ${causaDaFalhaDeBanco(erro)}`,
    );
    return resolverOrgConfig(null);
  }
});

type Resultado = { ok: true } | { ok: false; erro: string };

export async function atualizarOrgConfig(input: unknown): Promise<Resultado> {
  const user = await requirePermissao("admin.config.org.editar");
  if (!user.cerId) return { ok: false, erro: "Usuário sem CER vinculado." };

  const parsed = orgConfigInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, erro: parsed.error.issues[0].message };
  }
  const dados = parsed.data;

  const existente = await db.orgConfig.findUnique({ where: { cerId: user.cerId } });

  await db.$transaction(async (tx) => {
    const atualizado = await tx.orgConfig.upsert({
      where: { cerId: user.cerId! },
      update: {
        nomeExibido: dados.nomeExibido,
        logoUrl: dados.logoUrl || null,
        parceirosJson: dados.parceiros as Prisma.InputJsonValue,
      },
      create: {
        cerId: user.cerId!,
        nomeExibido: dados.nomeExibido,
        logoUrl: dados.logoUrl || null,
        parceirosJson: dados.parceiros as Prisma.InputJsonValue,
      },
    });

    await tx.auditoria.create({
      data: {
        actorId: user.id,
        action: "org-config.atualizar",
        entityType: "org_config",
        entityId: atualizado.id,
        beforeJson: existente
          ? {
              nomeExibido: existente.nomeExibido,
              logoUrl: existente.logoUrl,
              parceirosJson: existente.parceirosJson,
            }
          : Prisma.JsonNull,
        afterJson: {
          nomeExibido: atualizado.nomeExibido,
          logoUrl: atualizado.logoUrl,
          parceirosJson: atualizado.parceirosJson,
        },
      },
    });
  });

  revalidatePath("/", "layout");
  return { ok: true };
}
