import { createServer, type Server, type Socket } from "node:net";

export type ServidorSmtpFalso = {
  server: Server;
  port: number;
  mensagens: string[];
  fechar: () => Promise<void>;
};

/** Servidor SMTP mínimo em memória para testar o wire protocol do
 * SmtpEmailAdapter sem depender de MailHog/docker. */
export function iniciarServidorSmtpFalso(
  opts: { aceitar?: boolean } = {},
): Promise<ServidorSmtpFalso> {
  const mensagens: string[] = [];

  return new Promise((resolve) => {
    const server = createServer((socket: Socket) => {
      socket.write("220 fake.smtp ESMTP\r\n");
      let buffer = "";
      let emData = false;
      let corpo = "";

      socket.on("data", (chunk) => {
        buffer += chunk.toString("utf8");
        let idx: number;
        while ((idx = buffer.indexOf("\r\n")) !== -1) {
          const linha = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);

          if (emData) {
            if (linha === ".") {
              emData = false;
              mensagens.push(corpo);
              socket.write(opts.aceitar === false ? "550 recusado\r\n" : "250 OK\r\n");
              corpo = "";
            } else {
              corpo += `${linha}\n`;
            }
            continue;
          }

          if (linha.startsWith("EHLO")) socket.write("250 fake.smtp\r\n");
          else if (linha.startsWith("MAIL FROM")) socket.write("250 OK\r\n");
          else if (linha.startsWith("RCPT TO")) socket.write("250 OK\r\n");
          else if (linha === "DATA") {
            emData = true;
            socket.write("354 go ahead\r\n");
          } else if (linha === "QUIT") {
            socket.write("221 bye\r\n");
            socket.end();
          }
        }
      });
    });

    server.listen(0, "127.0.0.1", () => {
      const endereco = server.address();
      const port = typeof endereco === "object" && endereco ? endereco.port : 0;
      resolve({
        server,
        port,
        mensagens,
        fechar: () => new Promise((res) => server.close(() => res())),
      });
    });
  });
}
