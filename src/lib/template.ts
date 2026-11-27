import { label, tgl } from "./format";

export function isiTemplate(
  isi: string,
  s: { nomorSurat: string | null; tanggalSurat: Date | null; tujuan: string; perihal: string; lampiran: string | null; sifat: string; penandatangan: string | null },
) {
  const map: Record<string, string> = {
    nomor: s.nomorSurat ?? "(nomor diberikan setelah disetujui)",
    tanggal: s.tanggalSurat ? tgl(s.tanggalSurat) : "(tanggal)",
    tujuan: s.tujuan,
    perihal: s.perihal,
    lampiran: s.lampiran ?? "-",
    sifat: label(s.sifat),
    penandatangan: s.penandatangan ?? "",
  };
  return isi.replace(/\{\{\s*(\w+)\s*\}\}/g, (m, k: string) => map[k] ?? m);
}
