import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { suratKeluarScope } from "@/lib/akses";
import { inputDate, tgl, tglJam, todayJakarta } from "@/lib/format";
import { isiTemplate } from "@/lib/template";
import { Badge, Field, PageHeader } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/client";
import { hapusSuratKeluar, kirimSuratKeluar, verifikasiSuratKeluar } from "../actions";

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ msg?: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const { msg } = await searchParams;
  const s = await prisma.suratKeluar.findFirst({
    where: { id, ...suratKeluarScope(user) },
    include: {
      klasifikasi: true, unit: true, createdBy: true, verifikator: true, template: true,
      logs: { include: { user: true }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!s) notFound();

  const pemilik = s.createdById === user.id || user.role === "ADMIN";
  const bisaEdit = pemilik && ["DRAFT", "REVISI"].includes(s.status);
  const bisaVerif = s.status === "MENUNGGU_VERIFIKASI" && (s.verifikatorId === user.id || user.role === "PIMPINAN");
  const bisaKirim = pemilik && ["DISETUJUI", "TERKIRIM"].includes(s.status);
  const bisaHapus = user.role === "ADMIN" || (s.createdById === user.id && ["DRAFT", "REVISI", "DITOLAK"].includes(s.status));

  return (
    <>
      <PageHeader title={s.nomorSurat ? `Surat Keluar ${s.nomorSurat}` : "Surat Keluar (belum bernomor)"}>
        <Link href={`/surat-keluar/${s.id}/cetak`} target="_blank" className="btn-secondary">Pratinjau / Cetak</Link>
        {bisaEdit && <Link href={`/surat-keluar/${s.id}/edit`} className="btn-secondary">Edit</Link>}
        {bisaHapus && (
          <form action={hapusSuratKeluar}>
            <input type="hidden" name="id" value={s.id} />
            <SubmitButton className="btn-danger" confirm="Hapus surat keluar ini?">Hapus</SubmitButton>
          </form>
        )}
      </PageHeader>

      {msg && <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{msg}</div>}

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <div className="card">
            <dl className="grid gap-4 sm:grid-cols-2">
              <Field label="Status"><Badge value={s.status} /></Field>
              <Field label="Nomor Surat"><span className="font-mono">{s.nomorSurat ?? "-"}</span></Field>
              <Field label="Tanggal Surat">{tgl(s.tanggalSurat)}</Field>
              <Field label="Klasifikasi">{s.klasifikasi.kode} – {s.klasifikasi.nama}</Field>
              <Field label="Unit Pengolah">{s.unit.nama}</Field>
              <Field label="Sifat"><Badge value={s.sifat} /></Field>
              <div className="sm:col-span-2"><Field label="Tujuan">{s.tujuan}</Field></div>
              <div className="sm:col-span-2"><Field label="Perihal">{s.perihal}</Field></div>
              <Field label="Pembuat">{s.createdBy.nama}</Field>
              <Field label="Verifikator">{s.verifikator?.nama ?? "-"}</Field>
              {s.catatanVerifikasi && <div className="sm:col-span-2"><Field label="Catatan Verifikasi">{s.catatanVerifikasi}</Field></div>}
            </dl>
          </div>
          <div className="card">
            <h2 className="mb-2 font-semibold">Isi Surat</h2>
            <div className="whitespace-pre-wrap rounded border border-slate-200 bg-slate-50 p-4 font-serif text-sm">{isiTemplate(s.isi, s)}</div>
          </div>
        </div>

        <div className="space-y-5">
          {bisaVerif && (
            <div className="card border-amber-300">
              <h2 className="mb-3 font-semibold">Verifikasi</h2>
              <ActionForm action={verifikasiSuratKeluar} className="space-y-3">
                <input type="hidden" name="id" value={s.id} />
                <div>
                  <label className="lbl">Tanggal Surat (jika disetujui)</label>
                  <input type="date" name="tanggalSurat" className="input" defaultValue={inputDate(todayJakarta())} />
                </div>
                <div>
                  <label className="lbl">Catatan</label>
                  <textarea name="catatan" rows={3} className="input" placeholder="Wajib untuk revisi/penolakan" />
                </div>
                <div className="flex flex-wrap gap-2">
                  <SubmitButton name="keputusan" value="setuju" confirm="Setujui dan terbitkan nomor surat?">Setujui</SubmitButton>
                  <SubmitButton name="keputusan" value="revisi" className="btn-secondary">Minta Revisi</SubmitButton>
                  <SubmitButton name="keputusan" value="tolak" className="btn-danger">Tolak</SubmitButton>
                </div>
              </ActionForm>
            </div>
          )}
          {bisaKirim && (
            <div className="card">
              <h2 className="mb-3 font-semibold">{s.status === "TERKIRIM" ? "Perbarui Arsip" : "Tandai Terkirim"}</h2>
              <ActionForm action={kirimSuratKeluar} className="space-y-3">
                <input type="hidden" name="id" value={s.id} />
                <div>
                  <label className="lbl">Scan surat bertanda tangan (opsional, maks 4 MB)</label>
                  <input type="file" name="file" accept="application/pdf,image/*" className="input py-1.5" />
                </div>
                <div>
                  <label className="lbl">Catatan pengiriman</label>
                  <input name="catatan" className="input" placeholder="mis. dikirim via email / ekspedisi" />
                </div>
                <SubmitButton>{s.status === "TERKIRIM" ? "Simpan" : "Tandai Terkirim"}</SubmitButton>
              </ActionForm>
            </div>
          )}
          <div className="card">
            <h2 className="mb-2 font-semibold">Arsip File</h2>
            {s.fileId ? (
              <div className="flex flex-col gap-2 text-sm">
                <span className="truncate text-slate-600">{s.fileName}</span>
                <a className="btn-primary" href={`/api/files/${s.fileId}`} target="_blank">Lihat File</a>
                {s.fileUrl && <a className="btn-secondary" href={s.fileUrl} target="_blank">Buka di Google Drive</a>}
              </div>
            ) : <p className="text-sm text-slate-500">Belum ada file.</p>}
          </div>
          <div className="card">
            <h2 className="mb-3 font-semibold">Tracking</h2>
            <ol className="space-y-3 border-l-2 border-brand-100 pl-4 text-sm">
              {s.logs.map((l) => (
                <li key={l.id}>
                  <Badge value={l.status} />
                  <p className="mt-1">{l.catatan}</p>
                  <p className="text-xs text-slate-500">{l.user.nama} · {tglJam(l.createdAt)}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </>
  );
}
