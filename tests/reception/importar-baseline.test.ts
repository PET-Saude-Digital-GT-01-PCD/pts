/**
 * Testes de degradação da lógica de busca de baseline.
 * Testamos a porta BaselineSource diretamente — a integração com a Server Action
 * envolve next-auth (que requer ambiente Next.js) e é coberta pelos testes E2E.
 */
import { describe, it, expect, vi } from "vitest"
import type { BaselineSource, BaselineResult } from "@/server/reception/baseline-source"

/**
 * Utilitário: simula a lógica de degradação com timeout idêntica à da Server Action.
 * Extrai a lógica pura para teste unitário sem depender do next-auth.
 */
async function buscarComTimeout(
  source: BaselineSource,
  cpfOuCns: string,
  timeoutMs = 5_000
): Promise<BaselineResult> {
  try {
    const timeoutPromise = new Promise<BaselineResult>((resolve) =>
      setTimeout(() => resolve({ status: "indisponivel" }), timeoutMs)
    )
    const buscaPromise = source.getBaseline(cpfOuCns)
    return await Promise.race([buscaPromise, timeoutPromise])
  } catch {
    return { status: "indisponivel" }
  }
}

describe("degradação de busca de baseline", () => {
  it("fonte que lança exceção → retorna status indisponivel sem throw", async () => {
    const sourceQueQuebra: BaselineSource = {
      getBaseline: async () => {
        throw new Error("Conexão recusada")
      },
    }

    const resultado = await buscarComTimeout(sourceQueQuebra, "111.111.111-11")
    expect(resultado).toMatchObject({ status: "indisponivel" })
  })

  it("fonte que excede timeout → retorna status indisponivel sem throw", async () => {
    vi.useFakeTimers()

    const sourceLento: BaselineSource = {
      getBaseline: () =>
        new Promise<BaselineResult>((resolve) =>
          // Resolve depois de 10s — além do timeout de 5s
          setTimeout(() => resolve({ status: "ok", data: {} as never }), 10_000)
        ),
    }

    const promessa = buscarComTimeout(sourceLento, "111.111.111-11", 5_000)
    vi.advanceTimersByTime(6_000)
    const resultado = await promessa

    expect(resultado).toMatchObject({ status: "indisponivel" })

    vi.useRealTimers()
  })

  it("fonte disponível retorna dado corretamente", async () => {
    const sourceMock: BaselineSource = {
      getBaseline: async () => ({
        status: "ok",
        data: {
          diagnosticos: [{ cid10: "G80.0", descricao: "Paralisia cerebral" }],
          alergias: [],
          medicacoes: [],
          internacoes: [],
          origemJson: {
            diagnosticos: "importado",
            alergias: "importado",
            medicacoes: "importado",
            internacoes: "importado",
          },
        },
      }),
    }

    const resultado = await buscarComTimeout(sourceMock, "111.111.111-11")
    expect(resultado.status).toBe("ok")
    if (resultado.status === "ok") {
      expect(resultado.data.diagnosticos[0].cid10).toBe("G80.0")
      expect(resultado.data.origemJson.diagnosticos).toBe("importado")
    }
  })
})
