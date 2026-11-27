-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'PIMPINAN', 'KEPALA_UNIT', 'STAF');

-- CreateEnum
CREATE TYPE "Sifat" AS ENUM ('BIASA', 'PENTING', 'SEGERA', 'RAHASIA');

-- CreateEnum
CREATE TYPE "StatusSuratMasuk" AS ENUM ('BARU', 'DIDISPOSISI', 'SELESAI', 'DIARSIPKAN');

-- CreateEnum
CREATE TYPE "StatusDisposisi" AS ENUM ('BELUM_DIBACA', 'DIBACA', 'DIPROSES', 'SELESAI');

-- CreateEnum
CREATE TYPE "StatusSuratKeluar" AS ENUM ('DRAFT', 'MENUNGGU_VERIFIKASI', 'REVISI', 'DISETUJUI', 'DITOLAK', 'TERKIRIM');

-- CreateTable
CREATE TABLE "Unit" (
    "id" TEXT NOT NULL,
    "kode" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Unit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Jabatan" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Jabatan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Klasifikasi" (
    "id" TEXT NOT NULL,
    "kode" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "keterangan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Klasifikasi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "nip" TEXT,
    "email" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'STAF',
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "unitId" TEXT,
    "jabatanId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SuratMasuk" (
    "id" TEXT NOT NULL,
    "tahun" INTEGER NOT NULL,
    "noUrut" INTEGER NOT NULL,
    "nomorAgenda" TEXT NOT NULL,
    "nomorSurat" TEXT NOT NULL,
    "tanggalSurat" DATE NOT NULL,
    "tanggalTerima" DATE NOT NULL,
    "pengirim" TEXT NOT NULL,
    "perihal" TEXT NOT NULL,
    "sifat" "Sifat" NOT NULL DEFAULT 'BIASA',
    "lampiran" TEXT,
    "ringkasan" TEXT,
    "klasifikasiId" TEXT,
    "status" "StatusSuratMasuk" NOT NULL DEFAULT 'BARU',
    "fileId" TEXT,
    "fileName" TEXT,
    "fileUrl" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SuratMasuk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Disposisi" (
    "id" TEXT NOT NULL,
    "suratMasukId" TEXT NOT NULL,
    "parentId" TEXT,
    "dariId" TEXT NOT NULL,
    "kepadaId" TEXT NOT NULL,
    "instruksi" TEXT NOT NULL,
    "catatan" TEXT,
    "batasWaktu" DATE,
    "status" "StatusDisposisi" NOT NULL DEFAULT 'BELUM_DIBACA',
    "tanggapan" TEXT,
    "dibacaAt" TIMESTAMP(3),
    "selesaiAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Disposisi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TemplateSurat" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "jenis" TEXT NOT NULL DEFAULT 'Surat Dinas',
    "isi" TEXT NOT NULL,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TemplateSurat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SuratKeluar" (
    "id" TEXT NOT NULL,
    "tahun" INTEGER,
    "noUrut" INTEGER,
    "nomorSurat" TEXT,
    "klasifikasiId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "templateId" TEXT,
    "tanggalSurat" DATE,
    "tujuan" TEXT NOT NULL,
    "perihal" TEXT NOT NULL,
    "sifat" "Sifat" NOT NULL DEFAULT 'BIASA',
    "lampiran" TEXT,
    "isi" TEXT NOT NULL,
    "penandatangan" TEXT,
    "status" "StatusSuratKeluar" NOT NULL DEFAULT 'DRAFT',
    "verifikatorId" TEXT,
    "catatanVerifikasi" TEXT,
    "fileId" TEXT,
    "fileName" TEXT,
    "fileUrl" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SuratKeluar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SuratKeluarLog" (
    "id" TEXT NOT NULL,
    "suratKeluarId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "StatusSuratKeluar" NOT NULL,
    "catatan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SuratKeluarLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Counter" (
    "key" TEXT NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Counter_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "aksi" TEXT NOT NULL,
    "entitas" TEXT NOT NULL,
    "entitasId" TEXT,
    "detail" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Unit_kode_key" ON "Unit"("kode");

-- CreateIndex
CREATE UNIQUE INDEX "Jabatan_nama_key" ON "Jabatan"("nama");

-- CreateIndex
CREATE UNIQUE INDEX "Klasifikasi_kode_key" ON "Klasifikasi"("kode");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "SuratMasuk_nomorAgenda_key" ON "SuratMasuk"("nomorAgenda");

-- CreateIndex
CREATE INDEX "SuratMasuk_tanggalTerima_idx" ON "SuratMasuk"("tanggalTerima");

-- CreateIndex
CREATE INDEX "SuratMasuk_status_idx" ON "SuratMasuk"("status");

-- CreateIndex
CREATE UNIQUE INDEX "SuratMasuk_tahun_noUrut_key" ON "SuratMasuk"("tahun", "noUrut");

-- CreateIndex
CREATE INDEX "Disposisi_kepadaId_status_idx" ON "Disposisi"("kepadaId", "status");

-- CreateIndex
CREATE INDEX "Disposisi_suratMasukId_idx" ON "Disposisi"("suratMasukId");

-- CreateIndex
CREATE UNIQUE INDEX "SuratKeluar_nomorSurat_key" ON "SuratKeluar"("nomorSurat");

-- CreateIndex
CREATE INDEX "SuratKeluar_status_idx" ON "SuratKeluar"("status");

-- CreateIndex
CREATE UNIQUE INDEX "SuratKeluar_tahun_noUrut_key" ON "SuratKeluar"("tahun", "noUrut");

-- CreateIndex
CREATE INDEX "SuratKeluarLog_suratKeluarId_idx" ON "SuratKeluarLog"("suratKeluarId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entitas_entitasId_idx" ON "AuditLog"("entitas", "entitasId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_jabatanId_fkey" FOREIGN KEY ("jabatanId") REFERENCES "Jabatan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuratMasuk" ADD CONSTRAINT "SuratMasuk_klasifikasiId_fkey" FOREIGN KEY ("klasifikasiId") REFERENCES "Klasifikasi"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuratMasuk" ADD CONSTRAINT "SuratMasuk_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Disposisi" ADD CONSTRAINT "Disposisi_suratMasukId_fkey" FOREIGN KEY ("suratMasukId") REFERENCES "SuratMasuk"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Disposisi" ADD CONSTRAINT "Disposisi_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Disposisi"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Disposisi" ADD CONSTRAINT "Disposisi_dariId_fkey" FOREIGN KEY ("dariId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Disposisi" ADD CONSTRAINT "Disposisi_kepadaId_fkey" FOREIGN KEY ("kepadaId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuratKeluar" ADD CONSTRAINT "SuratKeluar_klasifikasiId_fkey" FOREIGN KEY ("klasifikasiId") REFERENCES "Klasifikasi"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuratKeluar" ADD CONSTRAINT "SuratKeluar_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuratKeluar" ADD CONSTRAINT "SuratKeluar_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "TemplateSurat"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuratKeluar" ADD CONSTRAINT "SuratKeluar_verifikatorId_fkey" FOREIGN KEY ("verifikatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuratKeluar" ADD CONSTRAINT "SuratKeluar_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuratKeluarLog" ADD CONSTRAINT "SuratKeluarLog_suratKeluarId_fkey" FOREIGN KEY ("suratKeluarId") REFERENCES "SuratKeluar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuratKeluarLog" ADD CONSTRAINT "SuratKeluarLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
