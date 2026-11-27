import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { suratKeluarScope } from "@/lib/akses";
import { label, tgl } from "@/lib/format";
import { isiTemplate } from "@/lib/template";
import { PrintButton } from "@/components/client";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const s = await prisma.suratKeluar.findFirst({ where: { id, ...suratKeluarScope(user) } });
  if (!s) notFound();
  const draft = !["DISETUJUI", "TERKIRIM"].includes(s.status);

  return (
    <div className="relative mx-auto min-h-[297mm] max-w-[210mm] bg-white px-[20mm] py-[15mm] font-serif text-[12pt] leading-relaxed text-black shadow print:shadow-none">
      <div className="no-print absolute right-4 top-4"><PrintButton /></div>
      {draft && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-[80pt] font-bold text-slate-200/70 [transform:rotate(-30deg)]">
          DRAFT
        </div>
      )}
      <div className="border-b-4 border-double border-black pb-2 text-center">
        <p className="text-[14pt] font-bold uppercase">{process.env.INSTANSI_NAMA || "Politeknik Kesehatan"}</p>
        <p className="text-[10pt]">{process.env.INSTANSI_ALAMAT || ""}</p>
      </div>
      <table className="mt-5 text-[12pt]">
        <tbody>
          <tr><td className="pr-3">Nomor</td><td>: {s.nomorSurat ?? "........"}</td></tr>
          <tr><td className="pr-3">Sifat</td><td>: {label(s.sifat)}</td></tr>
          <tr><td className="pr-3">Lampiran</td><td>: {s.lampiran || "-"}</td></tr>
          <tr><td className="pr-3 align-top">Perihal</td><td>: <b>{s.perihal}</b></td></tr>
        </tbody>
      </table>
      <p className="mt-2 text-right">{tgl(s.tanggalSurat)}</p>
      <p className="mt-4">Yth. {s.tujuan}</p>
      <div className="relative mt-4 whitespace-pre-wrap text-justify">{isiTemplate(s.isi, s)}</div>
      {s.penandatangan && (
        <div className="ml-auto mt-10 w-64 text-center">
          <div className="h-20" />
          <p className="whitespace-pre-wrap font-semibold">{s.penandatangan}</p>
        </div>
      )}
    </div>
  );
}
