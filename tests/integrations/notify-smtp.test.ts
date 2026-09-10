import { describe, expect, it } from "vitest";

import { SmtpEmailAdapter } from "@/server/integrations/notify/smtp";
import { iniciarServidorSmtpFalso } from "../helpers/fake-smtp";

describe("integrations/notify — SmtpEmailAdapter (cliente SMTP mínimo)", () => {
  it("envia a mensagem e o servidor recebe assunto + corpo", async () => {
    const fake = await iniciarServidorSmtpFalso();
    try {
      const adapter = new SmtpEmailAdapter("127.0.0.1", fake.port, "pts@local.test");
      await adapter.enviar({
        para: "esf@local.test",
        assunto: "PTS aberto para Maria",
        texto: "Acesse o caso: http://localhost:3000/casos/abc",
      });

      expect(fake.mensagens).toHaveLength(1);
      expect(fake.mensagens[0]).toContain("Subject: PTS aberto para Maria");
      expect(fake.mensagens[0]).toContain("To: esf@local.test");
      expect(fake.mensagens[0]).toContain("Acesse o caso");
    } finally {
      await fake.fechar();
    }
  });

  it("servidor recusando a mensagem rejeita a promessa", async () => {
    const fake = await iniciarServidorSmtpFalso({ aceitar: false });
    try {
      const adapter = new SmtpEmailAdapter("127.0.0.1", fake.port, "pts@local.test");
      await expect(
        adapter.enviar({ para: "x@local.test", assunto: "x", texto: "x" }),
      ).rejects.toThrow(/SMTP/);
    } finally {
      await fake.fechar();
    }
  });

  it("porta sem servidor rejeita a promessa (não trava indefinidamente)", async () => {
    const adapter = new SmtpEmailAdapter("127.0.0.1", 1, "pts@local.test");
    await expect(
      adapter.enviar({ para: "x@local.test", assunto: "x", texto: "x" }),
    ).rejects.toThrow();
  });
});
