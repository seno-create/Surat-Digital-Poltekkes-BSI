"use server";

import { revalidatePath } from "next/cache";
import type { StatusDisposisi } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { canViewSuratMasuk, kandidatTujuanDisposisi } from "@/lib/akses";
import { parseDate, str, strOrNull } from "@/lib/format";
import type { FormState } from "@/components/client";

export async function buatDisposisi(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const suratMasukId = str(fd.get("suratMasukId"));
  if (!(await canViewSuratMasuk(user, suratMasukId))) return { error: "Anda tidak memiliki akses ke surat ini." };

  const kepadaIds = fd.getAll("kepadaId").map(String).filter(Boolean);
  const instruksiPilihan = fd.getAll("instruksi").map(String).filter(Boolean);
  const instruksiLain = str(fd.get("instruksiLain"));
  const instruksi = [...instruksiPilihan, ...(instruksiLain ? [instruksiLain] : [])].join("; ");
  const catatan = strOrNull(fd.get("catatan"));
  const batasWaktu = parseDate(fd.get("batasWaktu"));

  if (!kepadaIds.length) return { error: "Pilih minimal satu tujuan disposisi." };
  if (!instruksi) return { error: "Isi instruksi disposisi." };

  const kandidat = await kandidatTujuanDisposisi(user);
  const boleh = new Set(kandidat.map((k) => k.id));
  if (kepadaIds.some((id) => !boleh.has(id))) return { error: "Ada tujuan yang tidak sesuai jenjang disposisi Anda." };

  // Disposisi induk = disposisi terakhir yang diterima user pada surat ini (jika ada)
  const induk = await prisma.disposisi.findFirst({
    where: { suratMasukId, kepadaId: user.id },
    orderBy: { createdAt: "desc" },
  });
  if (!induk && user.role !== "ADMIN" && user.role !== "PIMPINAN") {
    return { error: "Anda hanya dapat meneruskan surat yang didisposisikan kepada Anda." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.disposisi.createMany({
      data: kepadaIds.map((kepadaId) => ({
        suratMasukId,
        parentId: induk?.id ?? null,
        dariId: user.id,
        kepadaId,
        instruksi,
        catatan,
        batasWaktu,
      })),
    });
    await tx.suratMasuk.update({
      where: { id: suratMasukId },
      data: { status: "DIDISPOSISI" },
    });
    if (induk && induk.status !== "SELESAI") {
      await tx.disposisi.update({ where: { id: induk.id }, data: { status: "DIPROSES" } });
    }
  });
  await audit(user.id, "DISPOSISI", "SuratMasuk", suratMasukId, { kepadaIds, instruksi, batasWaktu: batasWaktu?.toISOString() ?? null });
  revalidatePath(`/surat-masuk/${suratMasukId}`);
  revalidatePath("/disposisi");
  return { ok: `Disposisi dikirim ke ${kepadaIds.length} penerima.` };
}

export async function tanggapiDisposisi(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const id = str(fd.get("id"));
  const status = str(fd.get("status")) as StatusDisposisi;
  const tanggapan = strOrNull(fd.get("tanggapan"));
  if (!["DIPROSES", "SELESAI"].includes(status)) return { error: "Status tidak valid." };
  const d = await prisma.disposisi.findUnique({ where: { id } });
  if (!d || d.kepadaId !== user.id) return { error: "Disposisi tidak ditemukan." };

  await prisma.disposisi.update({
    where: { id },
    data: {
      status,
      tanggapan,
      dibacaAt: d.dibacaAt ?? new Date(),
      selesaiAt: status === "SELESAI" ? new Date() : null,
    },
  });

  // Jika semua disposisi ujung (yang tidak diteruskan lagi) sudah selesai, tandai surat selesai
  const belum = await prisma.disposisi.count({
    where: { suratMasukId: d.suratMasukId, status: { not: "SELESAI" }, turunan: { none: {} } },
  });
  if (belum === 0) await prisma.suratMasuk.update({ where: { id: d.suratMasukId }, data: { status: "SELESAI" } });

  await audit(user.id, "TANGGAPI_DISPOSISI", "Disposisi", id, { status, tanggapan });
  revalidatePath(`/surat-masuk/${d.suratMasukId}`);
  revalidatePath("/disposisi");
  return { ok: "Tanggapan tersimpan." };
}
