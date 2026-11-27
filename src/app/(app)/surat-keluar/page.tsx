import Link from "next/link";
import type { Prisma, StatusSuratKeluar } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { suratKeluarScope } from "@/lib/akses";
import { tgl, tglJam } from "@/lib/format";
import { Badge, Empty, PageHeader, Pagination } from "@/components/ui";

const PER_PAGE = 20;
type SP = { q?: string; status?: string; page?: string; verif?: string };

export default async function Page({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const where: Prisma.SuratKeluarWhereInput = {
    AND: [
      suratKeluarScope(user),
      sp.q
        ? {
            OR: [
              { perihal: { contains: sp.q, mode: "insensitive" } },
              { tujuan: { contains: sp.q, mode: "insensitive" } },
              { nomorSurat: { contains: sp.q, mode: "insensitive" } },
            ],
          }
        : {},
      sp.status ? { status: sp.status as StatusSuratKeluar } : {},
      sp.verif ? { status: "MENUNGGU_VERIFIKASI", ...(user.role === "PIMPINAN" ? {} : { verifikatorId: user.id }) } : {},
    ],
  };
  const [rows, total] = await Promise.all([
    prisma.suratKeluar.findMany({
      where,
      include: { unit: true, createdBy: true, verifikator: true },
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    prisma.suratKeluar.count({ where }),
  ]);
  const bisaVerif = user.role === "PIMPINAN" || user.role === "KEPALA_UNIT";

  return (
    <>
      <PageHeader title="Surat Keluar">
        {bisaVerif && <Link href="/surat-keluar?verif=1" className="btn-secondary">Perlu Verifikasi Saya</Link>}
        <Link href="/surat-keluar/baru" className="btn-primary">+ Buat Surat Keluar</Link>
      </PageHeader>
      <form className="card mb-4 flex flex-wrap gap-3">
        <input name="q" defaultValue={sp.q} placeholder="Cari perihal, tujuan, nomor..." className="input max-w-sm" />
        <select name="status" defaultValue={sp.status ?? ""} className="input max-w-xs">
          <option value="">Semua status</option>
          {["DRAFT", "MENUNGGU_VERIFIKASI", "REVISI", "DISETUJUI", "DITOLAK", "TERKIRIM"].map((s) => (
            <option key={s} value={s}>{s.replace("_", " ")}</option>
          ))}
        </select>
        <button className="btn-primary">Filter</button>
        <Link href="/surat-keluar" className="btn-secondary">Reset</Link>
      </form>
      <div className="card overflow-x-auto p-0">
        {rows.length === 0 ? <Empty /> : (
          <table className="tbl">
            <thead>
              <tr><th>Nomor Surat</th><th>Tanggal</th><th>Tujuan / Perihal</th><th>Unit</th><th>Pembuat</th><th>Status</th><th>Diperbarui</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap font-mono text-xs">{r.nomorSurat ?? <span className="text-slate-400">belum bernomor</span>}</td>
                  <td className="whitespace-nowrap">{tgl(r.tanggalSurat)}</td>
                  <td>
                    <Link href={`/surat-keluar/${r.id}`} className="font-medium text-brand-700 hover:underline">{r.perihal}</Link>
                    <div className="text-xs text-slate-500">Kepada: {r.tujuan}</div>
                  </td>
                  <td>{r.unit.kode}</td>
                  <td>{r.createdBy.nama}</td>
                  <td><Badge value={r.status} /></td>
                  <td className="whitespace-nowrap text-xs">{tglJam(r.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <Pagination page={page} total={total} perPage={PER_PAGE} params={sp} />
    </>
  );
}
