import { db } from "@/lib/db";

// ponytail: deploy-per-org (ADR-0010) — uma instância serve um único CER.
// Rotas públicas (sem sessão, ex.: /cadastro, layout raiz) não têm como
// resolver o CER via usuário logado; usam o único registrado. Multi-instância
// real precisará de outro mecanismo de resolução (ex.: por domínio).
export async function buscarCerUnico() {
  return db.cer.findFirst({ select: { id: true } });
}
