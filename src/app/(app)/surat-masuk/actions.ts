"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Sifat, StatusSuratMasuk } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { formatNomorAgenda, nextCounter } from "@/lib/nomor";
import { parseDate, str, strOrNull } from "@/lib/format";
import { driveConfigured, uploadToDrive, validateUpload } from "@/lib/drive";
import type { FormState } from "@/components/client";

const SIFAT: Sifat[] = ["BIASA", "PENTING", "SEGERA", "RAHASIA"];

function baca(fd: FormData) {
  const sifat = str(fd.get("sifat")) as Sifat;
  return {
    nomorSurat: str(fd.get("nomorSurat")),
    tanggalSurat: parseDate(fd.get("tanggalSurat")),
    tanggalTerima: parseDate(fd.get("tanggalTerima")),
    pengirim: str(fd.get("pengirim")),
    perihal: str(fd.get("perihal")),
    sifat: SIFAT.includes(sifat) ? sifat : "BIASA",
    lampiran: strOrNull(fd.get("lampiran")),
    ringkasan: strOrNull(fd.get("ringkasan")),
    klasifikasiId: strOrNull(fd.get("klasifikasiId")),
  };
}

function cekWajib(d: ReturnType<typeof baca>) {
  if (!d.nomorSurat || !d.pengirim || !d.perihal || !d.tanggalSurat || !d.tanggalTerima)
    return "Nomor surat, tanggal surat, tanggal terima, pengirim, dan perihal wajib diisi.";
  return null;
}

export async function simpanSuratMasuk(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser(["ADMIN"]);
  const d = baca(fd);
  const err = cekWajib(d);
  if (err) return { error: err };
  const file = fd.get("file") as File | null;
  const fileErr = validateUpload(file);
  if (fileErr) return { error: fileErr };

  const tahun = d.tanggalTerima!.getUTCFullYear();
  const surat = await prisma.$transaction(async (tx) => {
    const urut = await nextCounter(tx, `SM-${tahun}`);
    return tx.suratMasuk.create({
      data: {
        ...d,
        tanggalSurat: d.tanggalSurat!,
        tanggalTerima: d.tanggalTerima!,
        tahun,
        noUrut: urut,
        nomorAgenda: formatNomorAgenda(urut, tahun),
        createdById: user.id,
      },
    });
  });

  let uploadMsg = "";
  if (file && file.size > 0) {
    if (!driveConfigured()) {
      uploadMsg = " (scan tidak diunggah: Google Drive belum dikonfigurasi)";
    } else {
      try {
        const up = await uploadToDrive(file, "Surat Masuk", d.tanggalTerima!, `${surat.nomorAgenda.replace(/\//g, "-")} ${d.perihal.slice(0, 60)}`);
        await prisma.suratMasuk.update({ where: { id: surat.id }, data: up });
      } catch (e) {
        console.error(e);
        uploadMsg = " (scan gagal diunggah ke Google Drive, coba unggah ulang di halaman edit)";
      }
    }
  }
  await audit(user.id, "CREATE", "SuratMasuk", surat.id, { nomorAgenda: surat.nomorAgenda });
  revalidatePath("/surat-masuk");
  redirect(`/surat-masuk/${surat.id}?msg=${encodeURIComponent("Surat masuk tersimpan dengan nomor agenda " + surat.nomorAgenda + uploadMsg)}`);
}

export async function ubahSuratMasuk(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser(["ADMIN"]);
  const id = str(fd.get("id"));
  const lama = await prisma.suratMasuk.findUnique({ where: { id } });
  if (!lama) return { error: "Surat tidak ditemukan." };
  const d = baca(fd);
  const err = cekWajib(d);
  if (err) return { error: err };
  const file = fd.get("file") as File | null;
  const fileErr = validateUpload(file);
  if (fileErr) return { error: fileErr };

  let up = {};
  if (file && file.size > 0) {
    if (!driveConfigured()) return { error: "Google Drive belum dikonfigurasi, file tidak bisa diunggah." };
    try {
      up = await uploadToDrive(file, "Surat Masuk", d.tanggalTerima!, `${lama.nomorAgenda.replace(/\//g, "-")} ${d.perihal.slice(0, 60)}`);
    } catch (e) {
      console.error(e);
      return { error: "Gagal mengunggah ke Google Drive. Periksa konfigurasi service account." };
    }
  }
  await prisma.suratMasuk.update({
    where: { id },
    data: { ...d, tanggalSurat: d.tanggalSurat!, tanggalTerima: d.tanggalTerima!, ...up },
  });
  await audit(user.id, "UPDATE", "SuratMasuk", id, { sebelum: { perihal: lama.perihal, pengirim: lama.pengirim }, fileBaru: !!(file && file.size) });
  revalidatePath(`/surat-masuk/${id}`);
  redirect(`/surat-masuk/${id}?msg=${encodeURIComponent("Perubahan tersimpan")}`);
}

export async function ubahStatusSuratMasuk(fd: FormData) {
  const user = await requireUser(["ADMIN", "PIMPINAN"]);
  const id = str(fd.get("id"));
  const status = str(fd.get("status")) as StatusSuratMasuk;
  if (!["BARU", "DIDISPOSISI", "SELESAI", "DIARSIPKAN"].includes(status)) return;
  await prisma.suratMasuk.update({ where: { id }, data: { status } });
  await audit(user.id, "STATUS", "SuratMasuk", id, { status });
  revalidatePath(`/surat-masuk/${id}`);
}

export async function hapusSuratMasuk(fd: FormData) {
  const user = await requireUser(["ADMIN"]);
  const id = str(fd.get("id"));
  const s = await prisma.suratMasuk.delete({ where: { id } });
  await audit(user.id, "DELETE", "SuratMasuk", id, { nomorAgenda: s.nomorAgenda, perihal: s.perihal, fileId: s.fileId });
  revalidatePath("/surat-masuk");
  redirect("/surat-masuk");
}
