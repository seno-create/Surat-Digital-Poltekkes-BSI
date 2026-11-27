import ExcelJS from "exceljs";
import { dataLaporan, periode, rekap, type Jenis } from "@/lib/laporan";
import { inputDate, tgl } from "@/lib/format";
import { audit } from "@/lib/audit";
import { userDariSession } from "../_user";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const user = await userDariSession();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const url = new URL(req.url);
  const jenis: Jenis = url.searchParams.get("jenis") === "keluar" ? "keluar" : "masuk";
  const { dari, sampai } = periode({ dari: url.searchParams.get("dari"), sampai: url.searchParams.get("sampai") });
  const rows = await dataLaporan(user, jenis, dari, sampai);

  const wb = new ExcelJS.Workbook();
  wb.creator = "Sistem Persuratan Dinas";
  const ws = wb.addWorksheet(jenis === "masuk" ? "Surat Masuk" : "Surat Keluar");
  ws.mergeCells("A1:H1");
  ws.getCell("A1").value = `${process.env.INSTANSI_NAMA || "Politeknik Kesehatan"} – Laporan ${jenis === "masuk" ? "Surat Masuk" : "Surat Keluar"}`;
  ws.getCell("A1").font = { bold: true, size: 13 };
  ws.mergeCells("A2:H2");
  ws.getCell("A2").value = `Periode ${tgl(dari)} s.d. ${tgl(sampai)} · Total ${rows.length} surat`;
  ws.addRow([]);
  const header = ws.addRow(["No", jenis === "masuk" ? "No. Agenda (No. Surat)" : "Nomor Surat", "Tanggal", jenis === "masuk" ? "Pengirim" : "Tujuan", "Perihal", "Klasifikasi", "Sifat", "Status"]);
  header.font = { bold: true };
  header.eachCell((c) => {
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD5ECE4" } };
    c.border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
  });
  rows.forEach((r, i) => {
    const row = ws.addRow([i + 1, r.nomor, r.tanggal, r.pihak, r.perihal, r.klasifikasi, r.sifat, r.status]);
    row.eachCell((c) => {
      c.border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
      c.alignment = { vertical: "top", wrapText: true };
    });
  });
  [5, 32, 16, 30, 45, 12, 10, 16].forEach((w, i) => (ws.getColumn(i + 1).width = w));

  const rk = wb.addWorksheet("Rekap");
  for (const [judul, key] of [["Per Sifat", "sifat"], ["Per Status", "status"], ["Per Klasifikasi", "klasifikasi"]] as const) {
    rk.addRow([judul]).font = { bold: true };
    rekap(rows, key).forEach(([k, v]) => rk.addRow([k, v]));
    rk.addRow([]);
  }
  rk.getColumn(1).width = 30;

  const buf = await wb.xlsx.writeBuffer();
  await audit(user.id, "EXPORT_EXCEL", "Laporan", null, { jenis, dari: inputDate(dari), sampai: inputDate(sampai) });
  return new Response(buf as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="laporan-surat-${jenis}-${inputDate(dari)}-${inputDate(sampai)}.xlsx"`,
    },
  });
}
