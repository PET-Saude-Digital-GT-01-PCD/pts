// Modelos canônicos internos (linguagem do domínio PTS). Nenhum acoplamento
// com e-SUS/RNDS — tradutores em ../format/ fazem a ponte (ADR-0008).

export type Medicacao = {
  nome: string;
  dosagem: string | null;
};

export type BaselinePaciente = {
  /** CPF ou CNS, só dígitos */
  identificador: string;
  /** Dados demográficos (opcionais, usados no preenchimento do formulário) */
  nome?: string;
  dtnasc?: string;
  sexo?: "MASCULINO" | "FEMININO" | "OUTRO";
  endereco?: string;
  
  diagnosticos: string[];
  alergias: string[];
  medicacoes: Medicacao[];
  internacoes: string[];
};

export type TipoMarcacao = "META" | "REVISAO" | "EVENTO";

export type MarcacaoPTS = {
  /** id do PTS no sistema de origem */
  ptsRef: string;
  tipo: TipoMarcacao;
  descricao: string;
  /** data ISO (YYYY-MM-DD) */
  data: string;
};

export type ReferenciaPTS = {
  ptsRef: string;
  pacienteIdentificador: string;
  resumo: string;
  destino: string;
};
