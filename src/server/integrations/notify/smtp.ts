import { Socket } from "node:net";

import type { EmailAdapter, EmailMensagem } from "./contract";

// Cliente SMTP mínimo sem AUTH/STARTTLS — suficiente para um relay local de
// confiança (MailHog em dev). ponytail: teto = sem autenticação/TLS; upgrade
// = nodemailer se um provedor de produção exigir SMTP autenticado.

type RespostaSmtp = { codigo: number; texto: string };

function lerResposta(socket: Socket): Promise<RespostaSmtp> {
  return new Promise((resolve, reject) => {
    let buffer = "";

    function onData(chunk: Buffer) {
      buffer += chunk.toString("utf8");
      const linhas = buffer.split("\r\n").filter((l) => l.length > 0);
      const ultima = linhas.at(-1);
      // Resposta multilinha do SMTP: "250-continua" ... "250 fim" (espaço, não hífen).
      if (ultima && /^\d{3} /.test(ultima)) {
        limpar();
        resolve({ codigo: Number(ultima.slice(0, 3)), texto: buffer });
      }
    }
    function onError(erro: Error) {
      limpar();
      reject(erro);
    }
    function limpar() {
      socket.off("data", onData);
      socket.off("error", onError);
    }

    socket.on("data", onData);
    socket.on("error", onError);
  });
}

async function enviarComando(
  socket: Socket,
  comando: string,
  codigoEsperado: number,
): Promise<void> {
  const resposta = lerResposta(socket);
  socket.write(`${comando}\r\n`);
  const { codigo, texto } = await resposta;
  if (codigo !== codigoEsperado) {
    throw new Error(
      `SMTP: esperado ${codigoEsperado}, servidor respondeu "${texto.trim()}"`,
    );
  }
}

async function enviarViaSmtp(
  host: string,
  port: number,
  from: string,
  msg: EmailMensagem,
): Promise<void> {
  const socket = new Socket();
  try {
    await new Promise<void>((resolve, reject) => {
      socket.once("error", reject);
      socket.connect(port, host, () => {
        socket.off("error", reject);
        resolve();
      });
    });

    await lerResposta(socket); // saudação (220)
    await enviarComando(socket, "EHLO pts.local", 250);
    await enviarComando(socket, `MAIL FROM:<${from}>`, 250);
    await enviarComando(socket, `RCPT TO:<${msg.para}>`, 250);
    await enviarComando(socket, "DATA", 354);

    const corpo = [
      `From: ${from}`,
      `To: ${msg.para}`,
      `Subject: ${msg.assunto}`,
      "",
      msg.texto,
      ".",
    ].join("\r\n");
    await enviarComando(socket, corpo, 250);

    socket.write("QUIT\r\n");
  } finally {
    socket.destroy();
  }
}

const TIMEOUT_MS = 5_000;

function comTimeout<T>(promessa: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promessa,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("Timeout ao enviar e-mail via SMTP.")), ms),
    ),
  ]);
}

export class SmtpEmailAdapter implements EmailAdapter {
  constructor(
    private readonly host: string,
    private readonly port: number,
    private readonly from: string,
  ) {}

  async enviar(mensagem: EmailMensagem): Promise<void> {
    await comTimeout(
      enviarViaSmtp(this.host, this.port, this.from, mensagem),
      TIMEOUT_MS,
    );
  }
}

/** Lê a config SMTP do ambiente a cada chamada (não no load do módulo) —
 * facilita testar com env var setada por teste. */
export function adapterSmtpPadrao(): SmtpEmailAdapter {
  return new SmtpEmailAdapter(
    process.env.SMTP_HOST ?? "localhost",
    Number(process.env.SMTP_PORT ?? 1025),
    process.env.SMTP_FROM ?? "pts@local.test",
  );
}
