import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canViewSuratMasuk } from "@/lib/akses";
import { tgl } from "@/lib/format";
import { PrintButton } from "@/components/client";
import { INSTRUKSI } from "../../../disposisi/form";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  if (!(await canViewSuratMasuk(user, id))) notFound();
  const s = await prisma.suratMasuk.findUnique({
    where: { id },
    include: {
      disposisi: {
        include: { dari: { include: { jabatan: true } }, kepada: { include: { jabatan: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!s) notFound();
  const dipakai = new Set(s.disposisi.flatMap((d) => d.instruksi.split("; ")));

  return (
    <div className="mx-auto max-w-[210mm] bg-white p-8 text-[13px] text-black shadow print:p-0 print:shadow-none">
      <div className="no-print mb-4 flex justify-end"><PrintButton /></div>
      <div className="border-b-4 border-double border-black pb-2 text-center">
        <p className="text-base font-bold uppercase">{process.env.INSTANSI_NAMA || "Politeknik Kesehatan"}</p>
        <p>{process.env.INSTANSI_ALAMAT || ""}</p>
      </div>
      <h1 className="my-3 text-center text-base font-bold underline">LEMBAR DISPOSISI</h1>
      <table className="w-full border-collapse border border-black [&_td]:border [&_td]:border-black [&_td]:p-1.5">
        <tbody>
          <tr><td className="w-1/4">Nomor Agenda</td><td>{s.nomorAgenda}</td><td className="w-1/5">Sifat</td><td>{s.sifat}</td></tr>
          <tr><td>Asal Surat</td><td colSpan={3}>{s.pengirim}</td></tr>
          <tr><td>Nomor Surat</td><td>{s.nomorSurat}</td><td>Tgl. Surat</td><td>{tgl(s.tanggalSurat)}</td></tr>
          <tr><td>Diterima Tgl.</td><td>{tgl(s.tanggalTerima)}</td><td>Lampiran</td><td>{s.lampiran || "-"}</td></tr>
          <tr><td>Perihal</td><td colSpan={3}>{s.perihal}</td></tr>
        </tbody>
      </table>

      <table className="mt-3 w-full border-collapse border border-black [&_td]:border [&_td]:border-black [&_td]:p-1.5 [&_th]:border [&_th]:border-black [&_th]:p-1.5">
        <thead>
          <tr><th className="w-1/2">Instruksi</th><th>Diteruskan Kepada</th></tr>
        </thead>
        <tbody>
          <tr>
            <td className="align-top">
              {INSTRUKSI.map((i) => (
                <div key={i}>{dipakai.has(i) ? "☑" : "☐"} {i}</div>
              ))}
            </td>
            <td className="align-top">
              {s.disposisi.length === 0 && <div className="h-32" />}
              {s.disposisi.map((d) => (
                <div key={d.id} className="mb-2">
                  <b>{d.kepada.jabatan?.nama ?? d.kepada.nama}</b> ({d.kepada.nama})
                  <div className="text-[12px]">dari {d.dari.jabatan?.nama ?? d.dari.nama} · {tgl(d.createdAt)}{d.batasWaktu && ` · batas ${tgl(d.batasWaktu)}`}</div>
                  <div className="text-[12px] italic">{d.instruksi}{d.catatan ? ` — ${d.catatan}` : ""}</div>
                </div>
              ))}
            </td>
          </tr>
        </tbody>
      </table>
      <div className="mt-3 min-h-24 border border-black p-1.5">
        <p className="font-semibold">Catatan / Tanggapan:</p>
        {s.disposisi.filter((d) => d.tanggapan).map((d) => (
          <p key={d.id}>- {d.kepada.nama}: {d.tanggapan}</p>
        ))}
      </div>
    </div>
  );
}
