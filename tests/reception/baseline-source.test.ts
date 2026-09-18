import { describe, it, expect } from "vitest"
import {
  mockBaselineSource,
  type BaselineData,
} from "@/server/reception/baseline-source"

describe("mockBaselineSource", () => {
  it("retorna dados para CPF conhecido (com pontuação)", async () => {
    const resultado = await mockBaselineSource.getBaseline("111.111.111-11")
    expect(resultado.status).toBe("ok")
    if (resultado.status === "ok") {
      const dados: BaselineData = resultado.data
      expect(dados.diagnosticos.length).toBeGreaterThan(0)
      expect(dados.diagnosticos[0].cid10).toBeDefined()
    }
  })

  it("retorna dados para CPF conhecido (sem pontuação)", async () => {
    const resultado = await mockBaselineSource.getBaseline("11111111111")
    expect(resultado.status).toBe("ok")
  })

  it("retorna dados para CNS conhecido", async () => {
    const resultado = await mockBaselineSource.getBaseline("900000000000001")
    expect(resultado.status).toBe("ok")
    if (resultado.status === "ok") {
      expect(resultado.data.diagnosticos[0].cid10).toBe("Q90")
    }
  })

  it("retorna nao_encontrado para CPF desconhecido", async () => {
    const resultado = await mockBaselineSource.getBaseline("999.999.999-99")
    expect(resultado.status).toBe("nao_encontrado")
  })

  it("origemJson marca todos os campos como importado", async () => {
    const resultado = await mockBaselineSource.getBaseline("111.111.111-11")
    expect(resultado.status).toBe("ok")
    if (resultado.status === "ok") {
      const { origemJson } = resultado.data
      expect(origemJson.diagnosticos).toBe("importado")
      expect(origemJson.alergias).toBe("importado")
      expect(origemJson.medicacoes).toBe("importado")
      expect(origemJson.internacoes).toBe("importado")
    }
  })
})
