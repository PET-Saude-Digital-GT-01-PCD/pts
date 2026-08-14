-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "citext";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- CreateEnum
CREATE TYPE "Escopo" AS ENUM ('FISICA', 'INTELECTUAL', 'VISUAL', 'AUDITIVA');

-- CreateEnum
CREATE TYPE "CategoriaProfissional" AS ENUM ('RECEPCAO', 'TRIADOR', 'MEDICO', 'FISIOTERAPEUTA', 'TERAPEUTA_OCUPACIONAL', 'PSICOLOGO', 'ENFERMEIRO');

-- CreateEnum
CREATE TYPE "Papel" AS ENUM ('RECEPCAO', 'TRIADOR', 'MEDICO', 'FISIOTERAPEUTA', 'TERAPEUTA_OCUPACIONAL', 'PSICOLOGO', 'REFERENCIA', 'GESTOR', 'ADMIN', 'USUARIO');

-- CreateEnum
CREATE TYPE "StatusPts" AS ENUM ('EM_AVALIACAO', 'PACTACAO', 'SEGUIMENTO', 'REAVALIACAO', 'FECHADO');

-- CreateEnum
CREATE TYPE "Semaforo" AS ENUM ('VERDE', 'AMARELO', 'VERMELHO');

-- CreateEnum
CREATE TYPE "StatusMeta" AS ENUM ('NOVA', 'EM_ANDAMENTO', 'CONCLUIDA', 'NAO_ALCANCADA');

-- CreateEnum
CREATE TYPE "OrigemDado" AS ENUM ('importado', 'digitado');

-- CreateEnum
CREATE TYPE "Sexo" AS ENUM ('MASCULINO', 'FEMININO', 'OUTRO');

-- CreateEnum
CREATE TYPE "CanalConsentimento" AS ENUM ('TABLET', 'WHATSAPP', 'GOVBR');

-- CreateEnum
CREATE TYPE "Especialidade" AS ENUM ('SOAP', 'FISIO', 'TO', 'PSICO');

-- CreateEnum
CREATE TYPE "Elegibilidade" AS ENUM ('ELEGIVEL', 'NAO_ELEGIVEL', 'REVISAO_MANUAL');

-- CreateTable
CREATE TABLE "cer" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nome" TEXT NOT NULL,
    "municipio" CITEXT NOT NULL,
    "escopos" "Escopo"[],
    "criadaEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuario" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "cerId" UUID NOT NULL,
    "email" CITEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "categoria" "CategoriaProfissional" NOT NULL,
    "papel" "Papel" NOT NULL,
    "criadoEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paciente" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "cerId" UUID NOT NULL,
    "cpf" CITEXT,
    "cns" CITEXT,
    "nome" TEXT NOT NULL,
    "dtnasc" TIMESTAMP(3) NOT NULL,
    "sexo" "Sexo" NOT NULL,
    "enderecoJson" JSONB,
    "ubsId" TEXT,
    "origem" "OrigemDado" NOT NULL DEFAULT 'digitado',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "paciente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cuidador" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "pacienteId" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "parentesco" TEXT NOT NULL,
    "idade" INTEGER,
    "comorbidadesJson" JSONB,
    "zaritScore" INTEGER,
    "vulnerabilidadesJson" JSONB,

    CONSTRAINT "cuidador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consentimento" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "pacienteId" UUID NOT NULL,
    "termoVersao" TEXT NOT NULL,
    "canal" "CanalConsentimento" NOT NULL,
    "data" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assinaturaRef" TEXT,
    "revogadoEm" TIMESTAMPTZ(3),

    CONSTRAINT "consentimento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "baseline" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "pacienteId" UUID NOT NULL,
    "importadoEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "diagnosticosJson" JSONB,
    "alergiasJson" JSONB,
    "medicacoesJson" JSONB,
    "internacoesJson" JSONB,
    "origemJson" JSONB,

    CONSTRAINT "baseline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "pacienteId" UUID NOT NULL,
    "cerId" UUID NOT NULL,
    "status" "StatusPts" NOT NULL DEFAULT 'EM_AVALIACAO',
    "refProfissionalId" UUID,
    "semaforoReuniao" "Semaforo" NOT NULL DEFAULT 'VERDE',
    "versao" INTEGER NOT NULL DEFAULT 0,
    "aberturaEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "encerramentoEm" TIMESTAMPTZ(3),
    "motivoEncerramento" TEXT,
    "criadoEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pts_revisao" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ptsId" UUID NOT NULL,
    "numero" INTEGER NOT NULL,
    "motivo" TEXT NOT NULL,
    "revisadoPorId" UUID NOT NULL,
    "data" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pts_revisao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "triagem" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ptsId" UUID NOT NULL,
    "motivo" TEXT NOT NULL,
    "eixosJson" JSONB NOT NULL,
    "pontuacaoJson" JSONB,
    "classificacao" "Semaforo" NOT NULL,
    "resultadoElegibilidade" "Elegibilidade" NOT NULL DEFAULT 'REVISAO_MANUAL',
    "justificativa" TEXT,
    "versao" INTEGER NOT NULL DEFAULT 0,
    "criadaEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "triagem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ajuste_classificacao" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "triagemId" UUID NOT NULL,
    "de" "Semaforo" NOT NULL,
    "para" "Semaforo" NOT NULL,
    "motivo" TEXT NOT NULL,
    "ajustadoPorId" UUID NOT NULL,
    "data" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ajuste_classificacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "avaliacao" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ptsId" UUID NOT NULL,
    "especialidade" "Especialidade" NOT NULL,
    "dadosJson" JSONB NOT NULL,
    "escoresJson" JSONB,
    "avaliadorId" UUID NOT NULL,
    "versao" INTEGER NOT NULL DEFAULT 0,
    "criadaEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "avaliacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meta" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ptsId" UUID NOT NULL,
    "avaliacaoId" UUID,
    "donoId" UUID NOT NULL,
    "descTecnica" TEXT NOT NULL,
    "descAcessivel" TEXT NOT NULL,
    "criteriosJson" JSONB NOT NULL,
    "status" "StatusMeta" NOT NULL DEFAULT 'NOVA',
    "prazo" TIMESTAMP(3) NOT NULL,
    "dataPactuacao" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataRevisao" TIMESTAMPTZ(3),
    "versao" INTEGER NOT NULL DEFAULT 0,
    "criadoEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meta_status_historico" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "metaId" UUID NOT NULL,
    "de" "StatusMeta",
    "para" "StatusMeta" NOT NULL,
    "autorId" UUID NOT NULL,
    "data" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "motivo" TEXT,

    CONSTRAINT "meta_status_historico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auditoria" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "actorId" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" UUID NOT NULL,
    "beforeJson" JSONB,
    "afterJson" JSONB,
    "motivo" TEXT,
    "criadaEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuario_email_key" ON "usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "paciente_cpf_key" ON "paciente"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "paciente_cns_key" ON "paciente"("cns");

-- CreateIndex
CREATE INDEX "paciente_cpf_idx" ON "paciente"("cpf");

-- CreateIndex
CREATE INDEX "paciente_cns_idx" ON "paciente"("cns");

-- CreateIndex
CREATE INDEX "consentimento_pacienteId_idx" ON "consentimento"("pacienteId");

-- CreateIndex
CREATE UNIQUE INDEX "baseline_pacienteId_key" ON "baseline"("pacienteId");

-- CreateIndex
CREATE INDEX "pts_pacienteId_idx" ON "pts"("pacienteId");

-- CreateIndex
CREATE INDEX "pts_cerId_status_idx" ON "pts"("cerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "pts_revisao_ptsId_numero_key" ON "pts_revisao"("ptsId", "numero");

-- CreateIndex
CREATE INDEX "triagem_ptsId_idx" ON "triagem"("ptsId");

-- CreateIndex
CREATE INDEX "avaliacao_ptsId_especialidade_idx" ON "avaliacao"("ptsId", "especialidade");

-- CreateIndex
CREATE INDEX "meta_ptsId_status_idx" ON "meta"("ptsId", "status");

-- CreateIndex
CREATE INDEX "meta_status_historico_metaId_data_idx" ON "meta_status_historico"("metaId", "data");

-- CreateIndex
CREATE INDEX "auditoria_entityType_entityId_criadaEm_idx" ON "auditoria"("entityType", "entityId", "criadaEm");

-- AddForeignKey
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_cerId_fkey" FOREIGN KEY ("cerId") REFERENCES "cer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paciente" ADD CONSTRAINT "paciente_cerId_fkey" FOREIGN KEY ("cerId") REFERENCES "cer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cuidador" ADD CONSTRAINT "cuidador_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "paciente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consentimento" ADD CONSTRAINT "consentimento_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "paciente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "baseline" ADD CONSTRAINT "baseline_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "paciente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pts" ADD CONSTRAINT "pts_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "paciente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pts" ADD CONSTRAINT "pts_cerId_fkey" FOREIGN KEY ("cerId") REFERENCES "cer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pts" ADD CONSTRAINT "pts_refProfissionalId_fkey" FOREIGN KEY ("refProfissionalId") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pts_revisao" ADD CONSTRAINT "pts_revisao_ptsId_fkey" FOREIGN KEY ("ptsId") REFERENCES "pts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pts_revisao" ADD CONSTRAINT "pts_revisao_revisadoPorId_fkey" FOREIGN KEY ("revisadoPorId") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "triagem" ADD CONSTRAINT "triagem_ptsId_fkey" FOREIGN KEY ("ptsId") REFERENCES "pts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ajuste_classificacao" ADD CONSTRAINT "ajuste_classificacao_triagemId_fkey" FOREIGN KEY ("triagemId") REFERENCES "triagem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ajuste_classificacao" ADD CONSTRAINT "ajuste_classificacao_ajustadoPorId_fkey" FOREIGN KEY ("ajustadoPorId") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "avaliacao" ADD CONSTRAINT "avaliacao_ptsId_fkey" FOREIGN KEY ("ptsId") REFERENCES "pts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "avaliacao" ADD CONSTRAINT "avaliacao_avaliadorId_fkey" FOREIGN KEY ("avaliadorId") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meta" ADD CONSTRAINT "meta_ptsId_fkey" FOREIGN KEY ("ptsId") REFERENCES "pts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meta" ADD CONSTRAINT "meta_avaliacaoId_fkey" FOREIGN KEY ("avaliacaoId") REFERENCES "avaliacao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meta" ADD CONSTRAINT "meta_donoId_fkey" FOREIGN KEY ("donoId") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meta_status_historico" ADD CONSTRAINT "meta_status_historico_metaId_fkey" FOREIGN KEY ("metaId") REFERENCES "meta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meta_status_historico" ADD CONSTRAINT "meta_status_historico_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditoria" ADD CONSTRAINT "auditoria_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
