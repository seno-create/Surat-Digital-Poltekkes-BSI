import PDFDocument from "pdfkit";
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

  const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 36 });
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((res) => doc.on("end", () => res(Buffer.concat(chunks))));

  doc.font("Helvetica-Bold").fontSize(14).text(process.env.INSTANSI_NAMA || "Politeknik Kesehatan", { align: "center" });
  doc.font("Helvetica").fontSize(11).text(`Laporan ${jenis === "masuk" ? "Surat Masuk" : "Surat Keluar"} · Periode ${tgl(dari)} s.d. ${tgl(sampai)}`, { align: "center" });
  doc.moveDown(0.3).fontSize(9).text(`Total ${rows.length} surat. ` + rekap(rows, "sifat").map(([k, v]) => `${k}: ${v}`).join(", "), { align: "center" });
  doc.moveDown();

  const cols = [
    { h: "No", w: 28 },
    { h: jenis === "masuk" ? "No. Agenda (No. Surat)" : "Nomor Surat", w: 150 },
    { h: "Tanggal", w: 75 },
    { h: jenis === "masuk" ? "Pengirim" : "Tujuan", w: 140 },
    { h: "Perihal", w: 230 },
    { h: "Klas.", w: 55 },
    { h: "Sifat", w: 50 },
    { h: "Status", w: 62 },
  ];
  const x0 = doc.page.margins.left;
  const drawRow = (vals: string[], bold = false) => {
    doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(8);
    const h = Math.max(...vals.map((v, i) => doc.heightOfString(v, { width: cols[i].w - 6 }))) + 6;
    if (doc.y + h > doc.page.height - doc.page.margins.bottom) {
      doc.addPage();
    }
    const y = doc.y;
    let x = x0;
    vals.forEach((v, i) => {
      if (bold) doc.rect(x, y, cols[i].w, h).fillAndStroke("#d5ece4", "#000").fillColor("#000");
      else doc.rect(x, y, cols[i].w, h).stroke();
      doc.text(v, x + 3, y + 3, { width: cols[i].w - 6 });
      x += cols[i].w;
    });
    doc.x = x0;
    doc.y = y + h;
  };
  drawRow(cols.map((c) => c.h), true);
  rows.forEach((r, i) => drawRow([String(i + 1), r.nomor, r.tanggal, r.pihak, r.perihal, r.klasifikasi, r.sifat, r.status]));
  if (!rows.length) doc.moveDown().font("Helvetica-Oblique").text("Tidak ada data pada periode ini.");
  doc.end();
  const buf = await done;

  await audit(user.id, "EXPORT_PDF", "Laporan", null, { jenis, dari: inputDate(dari), sampai: inputDate(sampai) });
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="laporan-surat-${jenis}-${inputDate(dari)}-${inputDate(sampai)}.pdf"`,
    },
  });
}
