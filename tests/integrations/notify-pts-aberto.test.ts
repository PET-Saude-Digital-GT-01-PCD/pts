import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { notificarPtsAberto } from "@/server/integrations/notify/pts-aberto";
import type { EmailAdapter } from "@/server/integrations/notify/contract";

function adapterEspiao() {
  const chamadas: Parameters<EmailAdapter["enviar"]>[0][] = [];
  const adapter: EmailAdapter = {
    enviar: async (msg) => {
      chamadas.push(msg);
    },
  };
  return { adapter, chamadas };
}

const ENV_ORIGINAL = { ...process.env };

beforeEach(() => {
  process.env = { ...ENV_ORIGINAL };
});

afterEach(() => {
  process.env = { ...ENV_ORIGINAL };
});

describe("integrations/notify — notificarPtsAberto", () => {
  it("sem NOTIFY_ESF_EMAIL configurado, não chama o adapter", async () => {
    delete process.env.NOTIFY_ESF_EMAIL;
    const { adapter, chamadas } = adapterEspiao();

    await notificarPtsAberto({ pacienteNome: "Maria", ptsId: "abc-123" }, adapter);

    expect(chamadas).toHaveLength(0);
  });

  it("com NOTIFY_ESF_EMAIL configurado, envia assunto e link do caso", async () => {
    process.env.NOTIFY_ESF_EMAIL = "esf@local.test";
    process.env.AUTH_URL = "http://localhost:3000";
    const { adapter, chamadas } = adapterEspiao();

    await notificarPtsAberto({ pacienteNome: "Maria Exemplo", ptsId: "abc-123" }, adapter);

    expect(chamadas).toHaveLength(1);
    expect(chamadas[0]?.para).toBe("esf@local.test");
    expect(chamadas[0]?.assunto).toContain("Maria Exemplo");
    expect(chamadas[0]?.texto).toContain("http://localhost:3000/casos/abc-123");
  });

  it("falha do adapter não propaga (ADR-0008: nunca trava o fluxo clínico)", async () => {
    process.env.NOTIFY_ESF_EMAIL = "esf@local.test";
    const adapterQuebrado: EmailAdapter = {
      enviar: async () => {
        throw new Error("SMTP fora do ar");
      },
    };
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      notificarPtsAberto({ pacienteNome: "Maria", ptsId: "abc-123" }, adapterQuebrado),
    ).resolves.toBeUndefined();

    spy.mockRestore();
  });
});
