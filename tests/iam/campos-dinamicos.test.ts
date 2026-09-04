import { describe, expect, it } from "vitest";
import { z } from "zod";

/**
 * Validação de campos dinâmicos do formulário de autocadastro.
 * Simula a lógica de construção do schema Zod a partir do formulario_config.
 */

type TipoCampo = "TEXTO" | "NUMERO" | "SELECAO" | "BOOLEAN" | "DATA";

interface CampoConfig {
  campo: string;
  rotulo: string;
  tipo: TipoCampo;
  obrigatorio: boolean;
  opcoesJson?: unknown;
}

function construirSchema(campos: CampoConfig[]) {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const c of campos) {
    let base: z.ZodTypeAny;

    switch (c.tipo) {
      case "NUMERO":
        base = z.coerce.number();
        break;
      case "SELECAO": {
        const opcoes = Array.isArray(c.opcoesJson) ? c.opcoesJson : [];
        base =
          opcoes.length > 0
            ? z.enum(opcoes as [string, ...string[]])
            : z.string();
        break;
      }
      case "BOOLEAN":
        base = z.coerce.boolean();
        break;
      case "DATA":
        base = z.coerce.date();
        break;
      default:
        base = z.string().trim().min(1);
    }

    shape[c.campo] = c.obrigatorio ? base : base.optional();
  }

  return z.object(shape);
}

const CAMPOS_BASE: CampoConfig[] = [
  { campo: "nome", rotulo: "Nome completo", tipo: "TEXTO", obrigatorio: true },
  { campo: "email", rotulo: "E-mail", tipo: "TEXTO", obrigatorio: true },
  { campo: "senha", rotulo: "Senha", tipo: "TEXTO", obrigatorio: true },
  {
    campo: "categoria",
    rotulo: "Categoria",
    tipo: "SELECAO",
    obrigatorio: true,
    opcoesJson: ["RECEPCAO", "MEDICO", "FISIOTERAPEUTA"],
  },
  { campo: "registro_conselho", rotulo: "Registro", tipo: "TEXTO", obrigatorio: false },
];

const schema = construirSchema(CAMPOS_BASE);

describe("campos-dinamicos — construção e validação de schema Zod", () => {
  it("aceita payload completo com todos os campos obrigatórios", () => {
    const result = schema.safeParse({
      nome: "Ana Paula Silva",
      email: "ana@cer.gov.br",
      senha: "senha123",
      categoria: "FISIOTERAPEUTA",
    });
    expect(result.success).toBe(true);
  });

  it("aceita payload com campo opcional preenchido", () => {
    const result = schema.safeParse({
      nome: "Ana Paula Silva",
      email: "ana@cer.gov.br",
      senha: "senha123",
      categoria: "MEDICO",
      registro_conselho: "CRM-PE 12345",
    });
    expect(result.success).toBe(true);
  });

  it("rejeita payload com campo obrigatório ausente (nome)", () => {
    const result = schema.safeParse({
      email: "ana@cer.gov.br",
      senha: "senha123",
      categoria: "MEDICO",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const campos = result.error.issues.map((i) => i.path[0]);
      expect(campos).toContain("nome");
    }
  });

  it("rejeita payload com campo obrigatório vazio (string vazia)", () => {
    const result = schema.safeParse({
      nome: "",
      email: "ana@cer.gov.br",
      senha: "senha123",
      categoria: "MEDICO",
    });
    expect(result.success).toBe(false);
  });

  it("rejeita categoria com opção inválida (fora do enum)", () => {
    const result = schema.safeParse({
      nome: "Ana Paula",
      email: "ana@cer.gov.br",
      senha: "senha123",
      categoria: "ADMIN", // não está no opcoesJson
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path[0]).toBe("categoria");
    }
  });

  it("aceita payload sem campo opcional (registro_conselho ausente)", () => {
    const result = schema.safeParse({
      nome: "João Souza",
      email: "joao@cer.gov.br",
      senha: "abc123",
      categoria: "RECEPCAO",
    });
    expect(result.success).toBe(true);
  });

  it("campo NUMERO converte string numérica", () => {
    const campoNum: CampoConfig[] = [
      { campo: "idade", rotulo: "Idade", tipo: "NUMERO", obrigatorio: true },
    ];
    const s = construirSchema(campoNum);
    const result = s.safeParse({ idade: "30" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.idade).toBe(30);
  });
});
