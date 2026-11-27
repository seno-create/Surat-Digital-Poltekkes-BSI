import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { suratKeluarScope, suratMasukScope } from "@/lib/akses";
import { tgl } from "@/lib/format";
import { Badge, Empty, PageHeader } from "@/components/ui";

type SP = { q?: string; tahun?: string; klasifikasiId?: string; jenis?: string };

export default async function Page({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const tahun = Number(sp.tahun) || new Date().getFullYear();
  const klasifikasi = await prisma.klasifikasi.findMany({ orderBy: { kode: "asc" } });
  const q = sp.q?.trim();

  const smWhere: Prisma.SuratMasukWhereInput = {
    AND: [
      suratMasukScope(user),
      { tahun },
      sp.klasifikasiId ? { klasifikasiId: sp.klasifikasiId } : {},
      q ? { OR: [{ perihal: { contains: q, mode: "insensitive" } }, { pengirim: { contains: q, mode: "insensitive" } }, { nomorSurat: { contains: q, mode: "insensitive" } }, { nomorAgenda: { contains: q, mode: "insensitive" } }, { ringkasan: { contains: q, mode: "insensitive" } }] } : {},
    ],
  };
  const skWhere: Prisma.SuratKeluarWhereInput = {
    AND: [
      suratKeluarScope(user),
      { tahun },
      { status: { in: ["DISETUJUI", "TERKIRIM"] } },
      sp.klasifikasiId ? { klasifikasiId: sp.klasifikasiId } : {},
      q ? { OR: [{ perihal: { contains: q, mode: "insensitive" } }, { tujuan: { contains: q, mode: "insensitive" } }, { nomorSurat: { contains: q, mode: "insensitive" } }] } : {},
    ],
  };

  const [sm, sk] = await Promise.all([
    sp.jenis === "keluar" ? [] : prisma.suratMasuk.findMany({ where: smWhere, include: { klasifikasi: true }, orderBy: { tanggalTerima: "desc" }, take: 100 }),
    sp.jenis === "masuk" ? [] : prisma.suratKeluar.findMany({ where: skWhere, include: { klasifikasi: true }, orderBy: { tanggalSurat: "desc" }, take: 100 }),
  ]);

  const items = [
    ...sm.map((s) => ({ id: s.id, href: `/surat-masuk/${s.id}`, jenis: "Masuk", nomor: s.nomorAgenda, tanggal: s.tanggalTerima, pihak: s.pengirim, perihal: s.perihal, klas: s.klasifikasi?.kode, status: s.status, file: s.fileId })),
    ...sk.map((s) => ({ id: s.id, href: `/surat-keluar/${s.id}`, jenis: "Keluar", nomor: s.nomorSurat ?? "-", tanggal: s.tanggalSurat, pihak: s.tujuan, perihal: s.perihal, klas: s.klasifikasi.kode, status: s.status, file: s.fileId })),
  ].sort((a, b) => (b.tanggal?.getTime() ?? 0) - (a.tanggal?.getTime() ?? 0));

  const tahunList = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i);

  return (
    <>
      <PageHeader title="Arsip Surat" />
      <form className="card mb-4 grid gap-3 sm:grid-cols-5">
        <input name="q" defaultValue={sp.q} placeholder="Cari di arsip..." className="input sm:col-span-2" />
        <select name="jenis" defaultValue={sp.jenis ?? ""} className="input">
          <option value="">Masuk & Keluar</option><option value="masuk">Surat Masuk</option><option value="keluar">Surat Keluar</option>
        </select>
        <select name="tahun" defaultValue={tahun} className="input">
          {tahunList.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select name="klasifikasiId" defaultValue={sp.klasifikasiId ?? ""} className="input">
          <option value="">Semua klasifikasi</option>
          {klasifikasi.map((k) => <option key={k.id} value={k.id}>{k.kode} – {k.nama}</option>)}
        </select>
        <div className="sm:col-span-5"><button className="btn-primary">Cari</button></div>
      </form>
      <div className="card overflow-x-auto p-0">
        {items.length === 0 ? <Empty text="Tidak ada surat di arsip untuk filter ini." /> : (
          <table className="tbl">
            <thead><tr><th>Jenis</th><th>Nomor</th><th>Tanggal</th><th>Pihak</th><th>Perihal</th><th>Klas.</th><th>Status</th><th>File</th></tr></thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.jenis + i.id}>
                  <td><span className={`badge ${i.jenis === "Masuk" ? "bg-sky-100 text-sky-800" : "bg-amber-100 text-amber-800"}`}>{i.jenis}</span></td>
                  <td className="font-mono text-xs">{i.nomor}</td>
                  <td className="whitespace-nowrap">{tgl(i.tanggal)}</td>
                  <td>{i.pihak}</td>
                  <td><Link href={i.href} className="text-brand-700 hover:underline">{i.perihal}</Link></td>
                  <td>{i.klas ?? "-"}</td>
                  <td><Badge value={i.status} /></td>
                  <td>{i.file ? <a href={`/api/files/${i.file}`} target="_blank" className="text-brand-700 hover:underline">Lihat</a> : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="mt-2 text-xs text-slate-500">Menampilkan maksimal 100 surat per jenis. Persempit pencarian bila perlu.</p>
    </>
  );
}
