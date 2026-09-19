import { db } from "@/lib/db";

// ponytail: deploy-per-org (ADR-0010) — uma instância serve um único CER.
// Rotas públicas (sem sessão, ex.: /cadastro, layout raiz) não têm como
// resolver o CER via usuário logado; usam o único registrado. O schema não
// impede um segundo CER, então ordena pelo mais antigo (o do seed) em vez de
// depender da ordem física do Postgres. Multi-instância real precisará de
// outro mecanismo de resolução (ex.: por domínio).
export async function buscarCerUnico() {
  return db.cer.findFirst({
    select: { id: true, papelAutocadastroId: true },
    orderBy: { criadaEm: "asc" },
  });
}
