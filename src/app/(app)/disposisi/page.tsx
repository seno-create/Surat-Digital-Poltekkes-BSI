import Link from "next/link";
import type { StatusDisposisi } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { tgl, tglJam } from "@/lib/format";
import { Badge, Empty, PageHeader } from "@/components/ui";

export default async function Page({ searchParams }: { searchParams: Promise<{ status?: string; tab?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const terkirim = sp.tab === "terkirim";
  const rows = await prisma.disposisi.findMany({
    where: {
      ...(terkirim ? { dariId: user.id } : { kepadaId: user.id }),
      ...(sp.status ? { status: sp.status as StatusDisposisi } : {}),
    },
    include: { suratMasuk: true, dari: true, kepada: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  const now = new Date();

  return (
    <>
      <PageHeader title="Disposisi" />
      <div className="mb-4 flex flex-wrap gap-2">
        <Link href="/disposisi" className={!terkirim ? "btn-primary" : "btn-secondary"}>Masuk ke Saya</Link>
        <Link href="/disposisi?tab=terkirim" className={terkirim ? "btn-primary" : "btn-secondary"}>Yang Saya Kirim</Link>
        <form className="ml-auto flex gap-2">
          {terkirim && <input type="hidden" name="tab" value="terkirim" />}
          <select name="status" defaultValue={sp.status ?? ""} className="input">
            <option value="">Semua status</option>
            <option value="BELUM_DIBACA">Belum dibaca</option>
            <option value="DIBACA">Dibaca</option>
            <option value="DIPROSES">Diproses</option>
            <option value="SELESAI">Selesai</option>
          </select>
          <button className="btn-secondary">Filter</button>
        </form>
      </div>
      <div className="card overflow-x-auto p-0">
        {rows.length === 0 ? (
          <Empty text="Tidak ada disposisi." />
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>{terkirim ? "Kepada" : "Dari"}</th>
                <th>Surat</th>
                <th>Instruksi</th>
                <th>Batas Waktu</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((d) => {
                const telat = d.batasWaktu && d.status !== "SELESAI" && d.batasWaktu < now;
                return (
                  <tr key={d.id} className={d.status === "BELUM_DIBACA" && !terkirim ? "bg-amber-50 font-medium" : ""}>
                    <td className="whitespace-nowrap">{tglJam(d.createdAt)}</td>
                    <td>{terkirim ? d.kepada.nama : d.dari.nama}</td>
                    <td>
                      <Link href={`/surat-masuk/${d.suratMasukId}`} className="text-brand-700 hover:underline">{d.suratMasuk.perihal}</Link>
                      <div className="text-xs text-slate-500">{d.suratMasuk.nomorAgenda} · {d.suratMasuk.pengirim}</div>
                    </td>
                    <td className="max-w-xs">{d.instruksi}</td>
                    <td className={`whitespace-nowrap ${telat ? "font-semibold text-red-600" : ""}`}>{d.batasWaktu ? tgl(d.batasWaktu) : "-"}</td>
                    <td><Badge value={d.status} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
