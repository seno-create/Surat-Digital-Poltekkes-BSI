import Link from "next/link";
import type { Prisma, Sifat, StatusSuratMasuk } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { suratMasukScope } from "@/lib/akses";
import { tgl, parseDate } from "@/lib/format";
import { Badge, Empty, PageHeader, Pagination } from "@/components/ui";

const PER_PAGE = 20;

type SP = { q?: string; sifat?: string; status?: string; dari?: string; sampai?: string; page?: string };

export default async function Page({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const dari = parseDate(sp.dari ?? null);
  const sampai = parseDate(sp.sampai ?? null);

  const where: Prisma.SuratMasukWhereInput = {
    AND: [
      suratMasukScope(user),
      sp.q
        ? {
            OR: [
              { perihal: { contains: sp.q, mode: "insensitive" } },
              { pengirim: { contains: sp.q, mode: "insensitive" } },
              { nomorSurat: { contains: sp.q, mode: "insensitive" } },
              { nomorAgenda: { contains: sp.q, mode: "insensitive" } },
            ],
          }
        : {},
      sp.sifat ? { sifat: sp.sifat as Sifat } : {},
      sp.status ? { status: sp.status as StatusSuratMasuk } : {},
      dari || sampai ? { tanggalTerima: { ...(dari ? { gte: dari } : {}), ...(sampai ? { lte: sampai } : {}) } } : {},
    ],
  };

  const [rows, total] = await Promise.all([
    prisma.suratMasuk.findMany({
      where,
      orderBy: [{ tanggalTerima: "desc" }, { noUrut: "desc" }],
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: { _count: { select: { disposisi: true } } },
    }),
    prisma.suratMasuk.count({ where }),
  ]);

  return (
    <>
      <PageHeader title="Surat Masuk">
        {user.role === "ADMIN" && <Link href="/surat-masuk/baru" className="btn-primary">+ Catat Surat Masuk</Link>}
      </PageHeader>

      <form className="card mb-4 grid gap-3 sm:grid-cols-6">
        <input name="q" defaultValue={sp.q} placeholder="Cari perihal, pengirim, nomor..." className="input sm:col-span-2" />
        <select name="sifat" defaultValue={sp.sifat ?? ""} className="input">
          <option value="">Semua sifat</option>
          <option value="BIASA">Biasa</option>
          <option value="PENTING">Penting</option>
          <option value="SEGERA">Segera</option>
          <option value="RAHASIA">Rahasia</option>
        </select>
        <select name="status" defaultValue={sp.status ?? ""} className="input">
          <option value="">Semua status</option>
          <option value="BARU">Baru</option>
          <option value="DIDISPOSISI">Didisposisi</option>
          <option value="SELESAI">Selesai</option>
          <option value="DIARSIPKAN">Diarsipkan</option>
        </select>
        <input type="date" name="dari" defaultValue={sp.dari} className="input" title="Diterima dari" />
        <input type="date" name="sampai" defaultValue={sp.sampai} className="input" title="Diterima sampai" />
        <div className="flex gap-2 sm:col-span-6">
          <button className="btn-primary">Filter</button>
          <Link href="/surat-masuk" className="btn-secondary">Reset</Link>
        </div>
      </form>

      <div className="card overflow-x-auto p-0">
        {rows.length === 0 ? (
          <Empty />
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>No. Agenda</th>
                <th>Diterima</th>
                <th>Pengirim</th>
                <th>Nomor / Perihal</th>
                <th>Sifat</th>
                <th>Status</th>
                <th>Disposisi</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap font-mono text-xs">
                    <Link href={`/surat-masuk/${r.id}`} className="text-brand-700 hover:underline">{r.nomorAgenda}</Link>
                  </td>
                  <td className="whitespace-nowrap">{tgl(r.tanggalTerima)}</td>
                  <td>{r.pengirim}</td>
                  <td>
                    <Link href={`/surat-masuk/${r.id}`} className="font-medium hover:underline">{r.perihal}</Link>
                    <div className="text-xs text-slate-500">{r.nomorSurat}</div>
                  </td>
                  <td><Badge value={r.sifat} /></td>
                  <td><Badge value={r.status} /></td>
                  <td className="text-center">{r._count.disposisi}</td>
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
