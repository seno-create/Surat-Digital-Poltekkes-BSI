import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { suratKeluarScope, suratMasukScope } from "@/lib/akses";
import { BULAN, tgl, todayJakarta } from "@/lib/format";
import { Badge } from "@/components/ui";

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await requireUser();
  const { error } = await searchParams;
  const today = todayJakarta();
  const tahun = today.getUTCFullYear();
  const awalBulan = new Date(Date.UTC(tahun, today.getUTCMonth(), 1));
  const awalTahun = new Date(Date.UTC(tahun, 0, 1));
  const smScope = suratMasukScope(user);
  const skScope = suratKeluarScope(user);

  const [smBulan, smTahun, skBulan, dispBelum, dispTelat, menungguVerif, perBulanSM, perBulanSK, disposisiSaya] = await Promise.all([
    prisma.suratMasuk.count({ where: { ...smScope, tanggalTerima: { gte: awalBulan } } }),
    prisma.suratMasuk.count({ where: { ...smScope, tanggalTerima: { gte: awalTahun } } }),
    prisma.suratKeluar.count({ where: { ...skScope, createdAt: { gte: awalBulan } } }),
    prisma.disposisi.count({ where: { kepadaId: user.id, status: { not: "SELESAI" } } }),
    prisma.disposisi.count({
      where: {
        status: { not: "SELESAI" },
        batasWaktu: { lt: today },
        ...(user.role === "ADMIN" || user.role === "PIMPINAN" ? {} : { kepadaId: user.id }),
      },
    }),
    prisma.suratKeluar.count({
      where: { status: "MENUNGGU_VERIFIKASI", ...(user.role === "ADMIN" || user.role === "PIMPINAN" ? {} : { verifikatorId: user.id }) },
    }),
    prisma.suratMasuk.groupBy({ by: ["tanggalTerima"], where: { ...smScope, tanggalTerima: { gte: awalTahun } }, _count: true }),
    prisma.suratKeluar.groupBy({ by: ["tanggalSurat"], where: { ...skScope, tanggalSurat: { gte: awalTahun } }, _count: true }),
    prisma.disposisi.findMany({
      where: { kepadaId: user.id, status: { not: "SELESAI" } },
      include: { suratMasuk: true, dari: true },
      orderBy: [{ batasWaktu: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
      take: 8,
    }),
  ]);

  const bulanSM = Array(12).fill(0);
  perBulanSM.forEach((r) => (bulanSM[r.tanggalTerima.getUTCMonth()] += r._count));
  const bulanSK = Array(12).fill(0);
  perBulanSK.forEach((r) => r.tanggalSurat && (bulanSK[r.tanggalSurat.getUTCMonth()] += r._count));
  const max = Math.max(1, ...bulanSM, ...bulanSK);

  const stat = [
    { label: "Surat masuk bulan ini", value: smBulan, href: "/surat-masuk" },
    { label: `Surat masuk ${tahun}`, value: smTahun, href: "/surat-masuk" },
    { label: "Surat keluar bulan ini", value: skBulan, href: "/surat-keluar" },
    { label: "Disposisi belum selesai (saya)", value: dispBelum, href: "/disposisi" },
    { label: "Disposisi lewat batas waktu", value: dispTelat, href: "/disposisi", warn: dispTelat > 0 },
    { label: "Surat keluar menunggu verifikasi", value: menungguVerif, href: "/surat-keluar?status=MENUNGGU_VERIFIKASI" },
  ];

  return (
    <>
      <h1 className="page-title mb-1">Selamat datang, {user.name}</h1>
      <p className="mb-5 text-sm text-slate-500">{tgl(today)}</p>
      {error === "akses" && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">Anda tidak memiliki akses ke halaman tersebut.</div>
      )}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {stat.map((s) => (
          <Link key={s.label} href={s.href} className={`card transition hover:shadow-md ${s.warn ? "border-red-300 bg-red-50" : ""}`}>
            <p className="text-sm text-slate-500">{s.label}</p>
            <p className={`mt-1 text-3xl font-bold ${s.warn ? "text-red-600" : "text-brand-700"}`}>{s.value}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        <div className="card lg:col-span-3">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Volume Surat {tahun}</h2>
            <div className="flex gap-3 text-xs text-slate-600">
              <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-brand-600" /> Masuk</span>
              <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-amber-400" /> Keluar</span>
            </div>
          </div>
          <div className="flex h-48 items-end gap-1.5">
            {BULAN.map((b, i) => (
              <div key={b} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex h-40 w-full items-end justify-center gap-0.5">
                  <div className="w-1/2 rounded-t bg-brand-600" style={{ height: `${(bulanSM[i] / max) * 100}%` }} title={`Masuk ${b}: ${bulanSM[i]}`} />
                  <div className="w-1/2 rounded-t bg-amber-400" style={{ height: `${(bulanSK[i] / max) * 100}%` }} title={`Keluar ${b}: ${bulanSK[i]}`} />
                </div>
                <span className="text-[10px] text-slate-500">{b.slice(0, 3)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card lg:col-span-2">
          <h2 className="mb-3 font-semibold">Disposisi untuk Saya</h2>
          {disposisiSaya.length === 0 ? (
            <p className="text-sm text-slate-500">Tidak ada disposisi yang perlu ditindaklanjuti.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {disposisiSaya.map((d) => (
                <li key={d.id} className="py-2 text-sm">
                  <Link href={`/surat-masuk/${d.suratMasukId}`} className="font-medium text-brand-700 hover:underline">{d.suratMasuk.perihal}</Link>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>dari {d.dari.nama}{d.batasWaktu && ` · batas ${tgl(d.batasWaktu)}`}</span>
                    <Badge value={d.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
