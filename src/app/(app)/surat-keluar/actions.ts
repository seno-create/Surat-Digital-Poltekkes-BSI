"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Sifat, StatusSuratKeluar } from "@prisma/client";
import { requireUser, type SessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { formatNomorSurat, nextCounter } from "@/lib/nomor";
import { str, strOrNull, todayJakarta, parseDate } from "@/lib/format";
import { driveConfigured, uploadToDrive, validateUpload } from "@/lib/drive";
import type { FormState } from "@/components/client";

const SIFAT: Sifat[] = ["BIASA", "PENTING", "SEGERA", "RAHASIA"];

function baca(fd: FormData) {
  const sifat = str(fd.get("sifat")) as Sifat;
  return {
    klasifikasiId: str(fd.get("klasifikasiId")),
    unitId: str(fd.get("unitId")),
    templateId: strOrNull(fd.get("templateId")),
    tujuan: str(fd.get("tujuan")),
    perihal: str(fd.get("perihal")),
    sifat: SIFAT.includes(sifat) ? sifat : ("BIASA" as Sifat),
    lampiran: strOrNull(fd.get("lampiran")),
    isi: str(fd.get("isi")),
    penandatangan: strOrNull(fd.get("penandatangan")),
    verifikatorId: strOrNull(fd.get("verifikatorId")),
  };
}

async function log(id: string, userId: string, status: StatusSuratKeluar, catatan?: string | null) {
  await prisma.suratKeluarLog.create({ data: { suratKeluarId: id, userId, status, catatan } });
}

async function validasi(d: ReturnType<typeof baca>, ajukan: boolean) {
  if (!d.klasifikasiId || !d.unitId || !d.tujuan || !d.perihal || !d.isi)
    return "Klasifikasi, unit pengolah, tujuan, perihal, dan isi surat wajib diisi.";
  if (ajukan) {
    if (!d.verifikatorId) return "Pilih verifikator untuk mengajukan surat.";
    const v = await prisma.user.findUnique({ where: { id: d.verifikatorId } });
    if (!v || !v.aktif || !["PIMPINAN", "KEPALA_UNIT"].includes(v.role)) return "Verifikator harus pimpinan atau kepala unit.";
  }
  return null;
}

export async function simpanSuratKeluar(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const id = strOrNull(fd.get("id"));
  const ajukan = str(fd.get("aksi")) === "ajukan";
  const d = baca(fd);
  const err = await validasi(d, ajukan);
  if (err) return { error: err };
  const status: StatusSuratKeluar = ajukan ? "MENUNGGU_VERIFIKASI" : "DRAFT";

  let suratId: string;
  if (id) {
    const lama = await prisma.suratKeluar.findUnique({ where: { id } });
    if (!lama) return { error: "Surat tidak ditemukan." };
    if (lama.createdById !== user.id && user.role !== "ADMIN") return { error: "Hanya pembuat surat yang dapat mengubah." };
    if (!["DRAFT", "REVISI"].includes(lama.status)) return { error: "Surat yang sudah diajukan/disetujui tidak dapat diubah." };
    await prisma.suratKeluar.update({ where: { id }, data: { ...d, status } });
    suratId = id;
    await audit(user.id, "UPDATE", "SuratKeluar", id, { status });
  } else {
    const s = await prisma.suratKeluar.create({ data: { ...d, status, createdById: user.id } });
    suratId = s.id;
    await audit(user.id, "CREATE", "SuratKeluar", s.id, { perihal: d.perihal, status });
  }
  await log(suratId, user.id, status, ajukan ? "Diajukan untuk verifikasi" : "Disimpan sebagai draft");
  revalidatePath("/surat-keluar");
  redirect(`/surat-keluar/${suratId}`);
}

async function ambilUntukVerifikasi(user: SessionUser, id: string) {
  const s = await prisma.suratKeluar.findUnique({ where: { id }, include: { klasifikasi: true, unit: true } });
  if (!s || s.status !== "MENUNGGU_VERIFIKASI") return null;
  if (s.verifikatorId !== user.id && user.role !== "PIMPINAN") return null;
  return s;
}

export async function verifikasiSuratKeluar(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser(["PIMPINAN", "KEPALA_UNIT"]);
  const id = str(fd.get("id"));
  const keputusan = str(fd.get("keputusan"));
  const catatan = strOrNull(fd.get("catatan"));
  const s = await ambilUntukVerifikasi(user, id);
  if (!s) return { error: "Surat tidak dalam status menunggu verifikasi Anda." };

  if (keputusan === "setuju") {
    const tanggal = parseDate(fd.get("tanggalSurat")) ?? todayJakarta();
    const tahun = tanggal.getUTCFullYear();
    const nomor = await prisma.$transaction(async (tx) => {
      const urut = await nextCounter(tx, `SK-${tahun}`);
      const nomorSurat = formatNomorSurat({ urut, klasifikasi: s.klasifikasi.kode, unit: s.unit.kode, tanggal: new Date(Date.UTC(tahun, tanggal.getUTCMonth(), tanggal.getUTCDate())) });
      await tx.suratKeluar.update({
        where: { id },
        data: { status: "DISETUJUI", tahun, noUrut: urut, nomorSurat, tanggalSurat: tanggal, catatanVerifikasi: catatan, verifikatorId: user.id },
      });
      return nomorSurat;
    });
    await log(id, user.id, "DISETUJUI", `Disetujui. Nomor: ${nomor}${catatan ? ". " + catatan : ""}`);
    await audit(user.id, "SETUJUI", "SuratKeluar", id, { nomorSurat: nomor });
    revalidatePath(`/surat-keluar/${id}`);
    redirect(`/surat-keluar/${id}?msg=${encodeURIComponent(`Surat disetujui dengan nomor ${nomor}.`)}`);
  }
  if (keputusan === "revisi" || keputusan === "tolak") {
    if (!catatan) return { error: "Isi catatan untuk revisi/penolakan." };
    const status: StatusSuratKeluar = keputusan === "revisi" ? "REVISI" : "DITOLAK";
    await prisma.suratKeluar.update({ where: { id }, data: { status, catatanVerifikasi: catatan } });
    await log(id, user.id, status, catatan);
    await audit(user.id, status, "SuratKeluar", id, { catatan });
    revalidatePath(`/surat-keluar/${id}`);
    redirect(`/surat-keluar/${id}?msg=${encodeURIComponent(keputusan === "revisi" ? "Surat dikembalikan untuk revisi." : "Surat ditolak.")}`);
  }
  return { error: "Keputusan tidak valid." };
}

export async function kirimSuratKeluar(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const id = str(fd.get("id"));
  const s = await prisma.suratKeluar.findUnique({ where: { id } });
  if (!s) return { error: "Surat tidak ditemukan." };
  if (user.role !== "ADMIN" && s.createdById !== user.id) return { error: "Hanya TU atau pembuat surat yang dapat menandai terkirim." };
  if (!["DISETUJUI", "TERKIRIM"].includes(s.status)) return { error: "Surat harus disetujui terlebih dahulu." };
  const file = fd.get("file") as File | null;
  const fileErr = validateUpload(file);
  if (fileErr) return { error: fileErr };
  const catatan = strOrNull(fd.get("catatan"));

  let up = {};
  if (file && file.size > 0) {
    if (!driveConfigured()) return { error: "Google Drive belum dikonfigurasi." };
    try {
      up = await uploadToDrive(file, "Surat Keluar", s.tanggalSurat ?? todayJakarta(), `${(s.nomorSurat ?? s.id).replace(/\//g, "-")} ${s.perihal.slice(0, 60)}`);
    } catch (e) {
      console.error(e);
      return { error: "Gagal mengunggah ke Google Drive." };
    }
  }
  await prisma.suratKeluar.update({ where: { id }, data: { status: "TERKIRIM", ...up } });
  await log(id, user.id, "TERKIRIM", catatan ?? (file && file.size ? "Scan surat bertanda tangan diunggah" : "Ditandai terkirim"));
  await audit(user.id, "TERKIRIM", "SuratKeluar", id, { fileBaru: !!(file && file.size) });
  revalidatePath(`/surat-keluar/${id}`);
  return { ok: "Surat ditandai terkirim." };
}

export async function hapusSuratKeluar(fd: FormData) {
  const user = await requireUser();
  const id = str(fd.get("id"));
  const s = await prisma.suratKeluar.findUnique({ where: { id } });
  if (!s) return;
  const boleh = user.role === "ADMIN" || (s.createdById === user.id && ["DRAFT", "REVISI", "DITOLAK"].includes(s.status));
  if (!boleh) return;
  await prisma.suratKeluar.delete({ where: { id } });
  await audit(user.id, "DELETE", "SuratKeluar", id, { perihal: s.perihal, nomorSurat: s.nomorSurat });
  revalidatePath("/surat-keluar");
  redirect("/surat-keluar");
}
