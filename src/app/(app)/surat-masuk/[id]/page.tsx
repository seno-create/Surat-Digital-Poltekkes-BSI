import Link from "next/link";
import { notFound } from "next/navigation";
import type { Disposisi, User } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canViewSuratMasuk, kandidatTujuanDisposisi } from "@/lib/akses";
import { tgl, tglJam } from "@/lib/format";
import { Badge, Field, PageHeader } from "@/components/ui";
import { SubmitButton } from "@/components/client";
import { DisposisiForm } from "../../disposisi/form";
import { TanggapanForm } from "../../disposisi/tanggapan-form";
import { hapusSuratMasuk, ubahStatusSuratMasuk } from "../actions";

type Node = Disposisi & { dari: User; kepada: User; children: Node[] };

function buildTree(list: (Disposisi & { dari: User; kepada: User })[]): Node[] {
  const map = new Map<string, Node>();
  list.forEach((d) => map.set(d.id, { ...d, children: [] }));
  const roots: Node[] = [];
  map.forEach((n) => {
    if (n.parentId && map.has(n.parentId)) map.get(n.parentId)!.children.push(n);
    else roots.push(n);
  });
  return roots;
}

function Tree({ nodes }: { nodes: Node[] }) {
  return (
    <ul className="space-y-3 border-l-2 border-brand-100 pl-4">
      {nodes.map((n) => {
        const telat = n.batasWaktu && n.status !== "SELESAI" && n.batasWaktu < new Date();
        return (
          <li key={n.id}>
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  <b>{n.dari.nama}</b> → <b>{n.kepada.nama}</b>
                </span>
                <span className="flex items-center gap-2">
                  {telat && <span className="badge bg-red-600 text-white">Lewat batas waktu</span>}
                  <Badge value={n.status} />
                </span>
              </div>
              <p className="mt-1">{n.instruksi}</p>
              {n.catatan && <p className="text-slate-600">Catatan: {n.catatan}</p>}
              <p className="mt-1 text-xs text-slate-500">
                Dikirim {tglJam(n.createdAt)}
                {n.batasWaktu && ` · Batas waktu ${tgl(n.batasWaktu)}`}
                {n.dibacaAt && ` · Dibaca ${tglJam(n.dibacaAt)}`}
                {n.selesaiAt && ` · Selesai ${tglJam(n.selesaiAt)}`}
              </p>
              {n.tanggapan && (
                <p className="mt-2 rounded bg-white p-2 text-slate-700">
                  <span className="text-xs font-semibold text-slate-500">Tanggapan: </span>
                  {n.tanggapan}
                </p>
              )}
            </div>
            {n.children.length > 0 && (
              <div className="mt-3">
                <Tree nodes={n.children} />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ msg?: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const { msg } = await searchParams;
  if (!(await canViewSuratMasuk(user, id))) notFound();

  // Tandai disposisi untuk user ini sebagai dibaca
  await prisma.disposisi.updateMany({
    where: { suratMasukId: id, kepadaId: user.id, status: "BELUM_DIBACA" },
    data: { status: "DIBACA", dibacaAt: new Date() },
  });

  const s = await prisma.suratMasuk.findUnique({
    where: { id },
    include: {
      klasifikasi: true,
      createdBy: true,
      disposisi: { include: { dari: true, kepada: true }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!s) notFound();

  const untukSaya = s.disposisi.filter((d) => d.kepadaId === user.id);
  const kandidat = await kandidatTujuanDisposisi(user);
  const bolehDisposisi =
    kandidat.length > 0 && (user.role === "ADMIN" || user.role === "PIMPINAN" || untukSaya.length > 0);

  return (
    <>
      <PageHeader title={`Surat Masuk ${s.nomorAgenda}`}>
        <Link href={`/surat-masuk/${s.id}/cetak-disposisi`} className="btn-secondary" target="_blank">
          Cetak Lembar Disposisi
        </Link>
        {user.role === "ADMIN" && (
          <>
            <Link href={`/surat-masuk/${s.id}/edit`} className="btn-secondary">Edit</Link>
            <form action={hapusSuratMasuk}>
              <input type="hidden" name="id" value={s.id} />
              <SubmitButton className="btn-danger" confirm="Hapus surat ini beserta seluruh disposisinya?">Hapus</SubmitButton>
            </form>
          </>
        )}
      </PageHeader>

      {msg && <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{msg}</div>}

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <dl className="grid gap-4 sm:grid-cols-2">
            <Field label="Nomor Agenda"><span className="font-mono">{s.nomorAgenda}</span></Field>
            <Field label="Nomor Surat">{s.nomorSurat}</Field>
            <Field label="Pengirim">{s.pengirim}</Field>
            <Field label="Tanggal Surat">{tgl(s.tanggalSurat)}</Field>
            <Field label="Tanggal Diterima">{tgl(s.tanggalTerima)}</Field>
            <Field label="Klasifikasi">{s.klasifikasi ? `${s.klasifikasi.kode} – ${s.klasifikasi.nama}` : "-"}</Field>
            <Field label="Sifat"><Badge value={s.sifat} /></Field>
            <Field label="Status"><Badge value={s.status} /></Field>
            <div className="sm:col-span-2"><Field label="Perihal">{s.perihal}</Field></div>
            <Field label="Lampiran">{s.lampiran || "-"}</Field>
            <Field label="Dicatat oleh">{s.createdBy.nama} · {tglJam(s.createdAt)}</Field>
            <div className="sm:col-span-2"><Field label="Ringkasan">{s.ringkasan || "-"}</Field></div>
          </dl>
        </div>
        <div className="space-y-5">
          <div className="card">
            <h2 className="mb-2 font-semibold">Scan Surat</h2>
            {s.fileId ? (
              <div className="flex flex-col gap-2 text-sm">
                <span className="truncate text-slate-600">{s.fileName}</span>
                <a className="btn-primary" href={`/api/files/${s.fileId}`} target="_blank">Lihat File</a>
                {s.fileUrl && <a className="btn-secondary" href={s.fileUrl} target="_blank">Buka di Google Drive</a>}
              </div>
            ) : (
              <p className="text-sm text-slate-500">Belum ada file scan.</p>
            )}
          </div>
          {(user.role === "ADMIN" || user.role === "PIMPINAN") && (
            <form action={ubahStatusSuratMasuk} className="card space-y-2" key={s.status}>
              <h2 className="font-semibold">Ubah Status</h2>
              <input type="hidden" name="id" value={s.id} />
              <select name="status" defaultValue={s.status} className="input">
                <option value="BARU">Baru</option>
                <option value="DIDISPOSISI">Didisposisi</option>
                <option value="SELESAI">Selesai</option>
                <option value="DIARSIPKAN">Diarsipkan</option>
              </select>
              <SubmitButton className="btn-secondary w-full">Simpan Status</SubmitButton>
            </form>
          )}
        </div>
      </div>

      {untukSaya.map((d) => (
        <div key={d.id} className="card mt-5 border-amber-300 bg-amber-50/40">
          <h2 className="mb-1 font-semibold">Disposisi untuk Anda dari {d.dari.nama}</h2>
          <p className="mb-3 text-sm">
            {d.instruksi}
            {d.batasWaktu && <span className="text-slate-600"> · Batas waktu {tgl(d.batasWaktu)}</span>}
          </p>
          <TanggapanForm d={d} />
        </div>
      ))}

      <div className="card mt-5">
        <h2 className="mb-3 font-semibold">Riwayat Disposisi</h2>
        {s.disposisi.length ? <Tree nodes={buildTree(s.disposisi)} /> : <p className="text-sm text-slate-500">Belum ada disposisi.</p>}
      </div>

      {bolehDisposisi && (
        <div className="card mt-5">
          <h2 className="mb-3 font-semibold">{user.role === "ADMIN" ? "Teruskan ke Pimpinan" : "Buat / Teruskan Disposisi"}</h2>
          <DisposisiForm suratMasukId={s.id} kandidat={kandidat} />
        </div>
      )}
    </>
  );
}
