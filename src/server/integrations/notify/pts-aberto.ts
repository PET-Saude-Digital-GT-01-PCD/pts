import type { EmailAdapter } from "./contract";
import { adapterSmtpPadrao } from "./smtp";

// PRD M1: notificação em loop fechado à eSF/UBS quando um PTS nasce.
// ponytail: teto = 1 destinatário fixo por deploy via env (coerente com
// deploy-per-org, ADR-0010); upgrade = contato por CER/UBS quando uma
// mesma instância atender mais de uma organização.
export async function notificarPtsAberto(
  dados: { pacienteNome: string; ptsId: string },
  adapter: EmailAdapter = adapterSmtpPadrao(),
): Promise<void> {
  const destino = process.env.NOTIFY_ESF_EMAIL;
  if (!destino) return;

  const baseUrl = process.env.AUTH_URL ?? "http://localhost:3000";
  const url = `${baseUrl}/casos/${dados.ptsId}`;

  try {
    await adapter.enviar({
      para: destino,
      assunto: `PTS aberto para ${dados.pacienteNome}`,
      texto: `Um novo Plano Terapêutico Singular foi aberto para ${dados.pacienteNome}.\n\nAcesse o caso: ${url}`,
    });
  } catch (erro) {
    // ADR-0008: falha de notificação nunca trava o fluxo clínico que a disparou.
    console.error("Falha ao enviar notificação de PTS aberto:", erro);
  }
}
