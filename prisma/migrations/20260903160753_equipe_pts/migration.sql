-- CreateTable
CREATE TABLE "equipe_pts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "usuarioId" UUID NOT NULL,
    "ptsId" UUID NOT NULL,
    "papelNoCaso" TEXT NOT NULL,
    "vinculadoEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "equipe_pts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "equipe_pts_usuarioId_ptsId_key" ON "equipe_pts"("usuarioId", "ptsId");

-- AddForeignKey
ALTER TABLE "equipe_pts" ADD CONSTRAINT "equipe_pts_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipe_pts" ADD CONSTRAINT "equipe_pts_ptsId_fkey" FOREIGN KEY ("ptsId") REFERENCES "pts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
