import bcrypt from "bcryptjs";
import { loadEnvFile } from "node:process";
import { PrismaClient } from "@prisma/client";

// tsx não carrega .env (só o CLI do Prisma carrega). Carregar quando presente.
try {
  loadEnvFile();
} catch {
  // .env ausente (ex.: CI injeta as variáveis diretamente)
}

const prisma = new PrismaClient();

// Senha padrão apenas para dev/piloto — sobrescrever com SEED_ADMIN_SENHA.
const SENHA_ADMIN = process.env.SEED_ADMIN_SENHA ?? "admin123";

const CER_PILOTO_ID = "00000000-0000-4000-8000-000000000001";

// Catálogo fixo de recursos (plano/17 §3). Não remover chaves: RBAC depende delas.
const RECURSOS = [
  ["recepcao.paciente.cadastrar", "recepcao", "Cadastrar/editar paciente e cuidador"],
  ["recepcao.paciente.ver", "recepcao", "Visualizar cadastro de paciente"],
  ["recepcao.consentimento.registrar", "recepcao", "Registrar consentimento LGPD"],
  ["recepcao.baseline.ver", "recepcao", "Visualizar linha de base (leitura)"],
  ["triage.triagem.escrever", "triage", "Preencher triagem e aplicar elegibilidade"],
  ["triage.triagem.ver", "triage", "Visualizar triagem"],
  ["triage.semaforo.ajustar", "triage", "Ajustar classificação do semáforo (justificativa obrigatória)"],
  ["triage.contrarreferencia.emissao", "triage", "Emitir guia de contrarreferência"],
  ["clinical.soap.ler", "clinical", "Ler avaliação SOAP"],
  ["clinical.soap.escrever", "clinical", "Registrar avaliação SOAP"],
  ["clinical.avaliacao.ler", "clinical", "Ler avaliações especializadas"],
  ["clinical.avaliacao.escrever", "clinical", "Registrar avaliação de especialidade"],
  ["care-plan.meta.ler", "care-plan", "Ler metas"],
  ["care-plan.meta.escrever", "care-plan", "Propor/editar metas"],
  ["care-plan.pts.revisar", "care-plan", "Conduzir revisões do PTS"],
  ["care-plan.pts.encerrar", "care-plan", "Encaminhar encerramento"],
  ["care-plan.mural.ler", "care-plan", "Ler mural do caso"],
  ["care-plan.mural.escrever", "care-plan", "Participar do mural do caso"],
  ["governanca.dashboard.ver", "governanca", "Dashboards de indicadores e filas"],
  ["governanca.auditoria.ver", "governanca", "Trilha de auditoria (leitura)"],
  ["governanca.relatorios.ver", "governanca", "Relatórios de produção e qualidade"],
  ["admin.usuarios.ver", "admin", "Listar usuários"],
  ["admin.usuarios.criar", "admin", "Criar usuário"],
  ["admin.usuarios.aprovar", "admin", "Aprovar/rejeitar admissão"],
  ["admin.papeis.gerenciar", "admin", "Gerenciar papéis e permissões"],
  ["admin.config.org.editar", "admin", "Editar configurações da org"],
];

// Matriz padrão (Perguntas/03) por papel base. base: CLINICO | GESTOR | ADMIN.
const PAPEIS_BASE = [
  {
    nome: "RECEPCAO",
    descricao: "Porta de entrada: cadastro, consentimento, cuidador",
    base: "CLINICO",
    recursos: [
      "recepcao.paciente.cadastrar",
      "recepcao.paciente.ver",
      "recepcao.consentimento.registrar",
      "recepcao.baseline.ver",
    ],
  },
  {
    nome: "TRIADOR",
    descricao: "Elegibilidade, priorização, contrarreferência",
    base: "CLINICO",
    recursos: [
      "recepcao.paciente.ver",
      "recepcao.baseline.ver",
      "triage.triagem.escrever",
      "triage.triagem.ver",
      "triage.semaforo.ajustar",
      "triage.contrarreferencia.emissao",
    ],
  },
  {
    nome: "MEDICO",
    descricao: "Avaliação SOAP, diagnóstico funcional, grade de serviços",
    base: "CLINICO",
    recursos: [
      "clinical.soap.ler",
      "clinical.soap.escrever",
      "clinical.avaliacao.ler",
      "care-plan.meta.ler",
      "care-plan.mural.ler",
    ],
  },
  {
    nome: "FISIOTERAPEUTA",
    descricao: "Avaliação fisio, metas, mural",
    base: "CLINICO",
    recursos: [
      "clinical.avaliacao.ler",
      "clinical.avaliacao.escrever",
      "care-plan.meta.ler",
      "care-plan.meta.escrever",
      "care-plan.mural.ler",
      "care-plan.mural.escrever",
    ],
  },
  {
    nome: "TERAPEUTA_OCUPACIONAL",
    descricao: "Avaliação T.O., metas, mural",
    base: "CLINICO",
    recursos: [
      "clinical.avaliacao.ler",
      "clinical.avaliacao.escrever",
      "care-plan.meta.ler",
      "care-plan.meta.escrever",
      "care-plan.mural.ler",
      "care-plan.mural.escrever",
    ],
  },
  {
    nome: "PSICOLOGO",
    descricao: "Avaliação psico, metas, mural",
    base: "CLINICO",
    recursos: [
      "clinical.avaliacao.ler",
      "clinical.avaliacao.escrever",
      "care-plan.meta.ler",
      "care-plan.meta.escrever",
      "care-plan.mural.ler",
      "care-plan.mural.escrever",
    ],
  },
  {
    nome: "REFERENCIA",
    descricao: "Acompanhamento do caso, pactuação, revisões, encerramento",
    base: "CLINICO",
    recursos: [
      "clinical.soap.ler",
      "clinical.avaliacao.ler",
      "care-plan.meta.ler",
      "care-plan.meta.escrever",
      "care-plan.pts.revisar",
      "care-plan.pts.encerrar",
      "care-plan.mural.ler",
      "care-plan.mural.escrever",
      "triage.triagem.ver",
    ],
  },
  {
    nome: "GESTOR",
    descricao: "Dashboards, indicadores, auditoria (sem conteúdo clínico individual)",
    base: "GESTOR",
    recursos: [
      "governanca.dashboard.ver",
      "governanca.auditoria.ver",
      "governanca.relatorios.ver",
      "triage.triagem.ver",
      "triage.semaforo.ajustar",
    ],
  },
  {
    nome: "ADMIN",
    descricao: "Administrador técnico: configuração, usuários, papéis",
    base: "ADMIN",
    recursos: [
      "governanca.dashboard.ver",
      "governanca.auditoria.ver",
      "governanca.relatorios.ver",
      "admin.usuarios.ver",
      "admin.usuarios.criar",
      "admin.usuarios.aprovar",
      "admin.papeis.gerenciar",
      "admin.config.org.editar",
    ],
  },
];

async function upsertRecursos() {
  for (const [chave, grupo, descricao] of RECURSOS) {
    await prisma.recurso.upsert({
      where: { chave },
      update: {},
      create: { chave, grupo, descricao },
    });
  }
}

async function upsertPapeis(cerId: string) {
  for (const p of PAPEIS_BASE) {
    const papel = await prisma.papel.upsert({
      where: { cerId_nome: { cerId, nome: p.nome } },
      update: { descricao: p.descricao, base: p.base as never, ativo: true },
      create: {
        cerId,
        nome: p.nome,
        descricao: p.descricao,
        base: p.base as never,
        ativo: true,
      },
    });

    const recursos = await prisma.recurso.findMany({
      where: { chave: { in: p.recursos } },
      select: { id: true },
    });

    await prisma.papelRecurso.createMany({
      data: recursos.map((r) => ({ papelId: papel.id, recursoId: r.id })),
      skipDuplicates: true,
    });
  }
}

async function main() {
  const cer = await prisma.cer.upsert({
    where: { id: CER_PILOTO_ID },
    update: {},
    create: {
      id: CER_PILOTO_ID,
      nome: "CER Piloto",
      municipio: "Recife",
      escopos: ["FISICA", "INTELECTUAL"],
    },
  });

  await upsertRecursos();
  await upsertPapeis(cer.id);

  const papelAdmin = await prisma.papel.findUniqueOrThrow({
    where: { cerId_nome: { cerId: cer.id, nome: "ADMIN" } },
  });

  const papelFisio = await prisma.papel.findUniqueOrThrow({
    where: { cerId_nome: { cerId: cer.id, nome: "FISIOTERAPEUTA" } },
  });

  const senhaHash = await bcrypt.hash(SENHA_ADMIN, 10);

  await prisma.usuario.upsert({
    where: { email: "admin@pts.local" },
    update: { senhaHash, papelId: papelAdmin.id, status: "ATIVO" },
    create: {
      email: "admin@pts.local",
      senhaHash,
      nome: "Administrador",
      categoria: "ENFERMEIRO",
      papelId: papelAdmin.id,
      status: "ATIVO",
      cerId: cer.id,
    },
  });

  await prisma.usuario.upsert({
    where: { email: "fisio@pts.local" },
    update: { papelId: papelFisio.id, status: "ATIVO" },
    create: {
      email: "fisio@pts.local",
      senhaHash: await bcrypt.hash("fisio123", 10),
      nome: "Fisioterapeuta",
      categoria: "FISIOTERAPEUTA",
      papelId: papelFisio.id,
      status: "ATIVO",
      cerId: cer.id,
    },
  });

  await prisma.usuario.upsert({
    where: { email: "pendente@pts.local" },
    update: {},
    create: {
      email: "pendente@pts.local",
      senhaHash: await bcrypt.hash("pendente123", 10),
      nome: "Usuária Pendente",
      categoria: "RECEPCAO",
      papelId: papelAdmin.id,
      status: "PENDENTE",
      cerId: cer.id,
    },
  });

  await prisma.usuario.upsert({
    where: { email: "bloqueado@pts.local" },
    update: {},
    create: {
      email: "bloqueado@pts.local",
      senhaHash: await bcrypt.hash("bloqueado123", 10),
      nome: "Usuária Bloqueada",
      categoria: "RECEPCAO",
      papelId: papelAdmin.id,
      status: "BLOQUEADO",
      cerId: cer.id,
    },
  });

  // ===== exemplo painel/dashboard (issue #16) =====
  const PACIENTE_ATIVO_ID = "00000000-0000-4000-8000-000000000002";
  const PACIENTE_FECHADO_ID = "00000000-0000-4000-8000-000000000003";
  const PTS_ATIVO_ID = "00000000-0000-4000-8000-000000000010";
  const PTS_FECHADO_ID = "00000000-0000-4000-8000-000000000011";

  const fisio = await prisma.usuario.findUniqueOrThrow({
    where: { email: "fisio@pts.local" },
  });

  const pacienteAtivo = await prisma.paciente.upsert({
    where: { cpf: "11144477735" },
    update: {},
    create: {
      id: PACIENTE_ATIVO_ID,
      cerId: cer.id,
      cpf: "11144477735",
      nome: "Maria Exemplo",
      dtnasc: new Date("1995-03-15"),
      sexo: "FEMININO",
    },
  });

  const pacienteFechado = await prisma.paciente.upsert({
    where: { cpf: "12345678909" },
    update: {},
    create: {
      id: PACIENTE_FECHADO_ID,
      cerId: cer.id,
      cpf: "12345678909",
      nome: "João Exemplo",
      dtnasc: new Date("1988-07-22"),
      sexo: "MASCULINO",
    },
  });

  await prisma.pts.upsert({
    where: { id: PTS_ATIVO_ID },
    update: {},
    create: {
      id: PTS_ATIVO_ID,
      pacienteId: pacienteAtivo.id,
      cerId: cer.id,
      status: "EM_AVALIACAO",
      refProfissionalId: fisio.id,
      semaforoReuniao: "AMARELO",
      versao: 0,
    },
  });

  await prisma.pts.upsert({
    where: { id: PTS_FECHADO_ID },
    update: {},
    create: {
      id: PTS_FECHADO_ID,
      pacienteId: pacienteFechado.id,
      cerId: cer.id,
      status: "FECHADO",
      refProfissionalId: fisio.id,
      versao: 4,
      encerramentoEm: new Date(),
      motivoEncerramento: "Alta com contrarreferência à APS.",
    },
  });

  // ===== recepção (issues #3/#19) =====
  const papelRecepcao = await prisma.papel.findUniqueOrThrow({
    where: { cerId_nome: { cerId: cer.id, nome: "RECEPCAO" } },
  });
  await prisma.usuario.upsert({
    where: { email: "recepcao@pts.local" },
    update: { papelId: papelRecepcao.id, status: "ATIVO" },
    create: {
      email: "recepcao@pts.local",
      senhaHash: await bcrypt.hash("recepcao123", 10),
      nome: "Recepção",
      categoria: "RECEPCAO",
      papelId: papelRecepcao.id,
      status: "ATIVO",
      cerId: cer.id,
    },
  });

  await prisma.eventoCuidado.upsert({
    where: { id: "00000000-0000-4000-8000-000000000020" },
    update: {},
    create: {
      ptsId: PTS_ATIVO_ID,
      tipo: "FALTA",
      data: new Date(),
      observacao: "Exemplo de falta recente para o alerta do painel (#25).",
      registradoPorId: fisio.id,
    },
  });

  // ===== soap (issue #5) =====
  const papelMedico = await prisma.papel.findUniqueOrThrow({
    where: { cerId_nome: { cerId: cer.id, nome: "MEDICO" } },
  });
  await prisma.usuario.upsert({
    where: { email: "medico@pts.local" },
    update: { papelId: papelMedico.id, status: "ATIVO" },
    create: {
      email: "medico@pts.local",
      senhaHash: await bcrypt.hash("medico123", 10),
      nome: "Médico Exemplo",
      categoria: "MEDICO",
      papelId: papelMedico.id,
      status: "ATIVO",
      cerId: cer.id,
    },
  });

  console.log(
    `Seed ok: CER, ${RECURSOS.length} recursos, ${PAPEIS_BASE.length} papéis base e usuários admin/pendente/bloqueado criados.`,
  );
  console.log(
    `Seed exemplo painel (#16): PTS ativo ${PTS_ATIVO_ID} (Maria) e PTS fechado ${PTS_FECHADO_ID} (João).`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());