import type { SessionUser } from "./auth";
import { prisma } from "./prisma";
import { suratKeluarScope, suratMasukScope } from "./akses";
import { label, parseDate, tgl } from "./format";

export type Jenis = "masuk" | "keluar";

export function periode(sp: { dari?: string | null; sampai?: string | null }) {
  const now = new Date();
  const dari = parseDate(sp.dari ?? null) ?? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const sampai = parseDate(sp.sampai ?? null) ?? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
  return { dari, sampai };
}

export type BarisLaporan = {
  nomor: string;
  tanggal: string;
  pihak: string;
  perihal: string;
  klasifikasi: string;
  sifat: string;
  status: string;
};

export async function dataLaporan(user: SessionUser, jenis: Jenis, dari: Date, sampai: Date) {
  if (jenis === "masuk") {
    const rows = await prisma.suratMasuk.findMany({
      where: { ...suratMasukScope(user), tanggalTerima: { gte: dari, lte: sampai } },
      include: { klasifikasi: true },
      orderBy: [{ tanggalTerima: "asc" }, { noUrut: "asc" }],
    });
    return rows.map<BarisLaporan>((r) => ({
      nomor: `${r.nomorAgenda} (${r.nomorSurat})`,
      tanggal: tgl(r.tanggalTerima),
      pihak: r.pengirim,
      perihal: r.perihal,
      klasifikasi: r.klasifikasi?.kode ?? "-",
      sifat: label(r.sifat),
      status: label(r.status),
    }));
  }
  const rows = await prisma.suratKeluar.findMany({
    where: { ...suratKeluarScope(user), OR: [{ tanggalSurat: { gte: dari, lte: sampai } }, { tanggalSurat: null, createdAt: { gte: dari, lte: new Date(sampai.getTime() + 86400000) } }] },
    include: { klasifikasi: true, unit: true },
    orderBy: [{ tanggalSurat: "asc" }, { noUrut: "asc" }],
  });
  return rows.map<BarisLaporan>((r) => ({
    nomor: r.nomorSurat ?? "(belum bernomor)",
    tanggal: tgl(r.tanggalSurat),
    pihak: r.tujuan,
    perihal: r.perihal,
    klasifikasi: r.klasifikasi.kode,
    sifat: label(r.sifat),
    status: label(r.status),
  }));
}

export function rekap(rows: BarisLaporan[], key: keyof BarisLaporan) {
  const m = new Map<string, number>();
  rows.forEach((r) => m.set(r[key], (m.get(r[key]) ?? 0) + 1));
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}
