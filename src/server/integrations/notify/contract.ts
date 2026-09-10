export type EmailMensagem = {
  para: string;
  assunto: string;
  texto: string;
};

/** Porta de saída para e-mail. Falha de envio nunca deve travar o fluxo
 * clínico que a disparou (ADR-0008) — quem chama o adapter é responsável
 * por isolar a falha, não o adapter. */
export interface EmailAdapter {
  enviar(mensagem: EmailMensagem): Promise<void>;
}
