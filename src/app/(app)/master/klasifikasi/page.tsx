import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/client";
import { simpanMaster } from "../actions";
import { BatalLink, EditLink, HapusButton } from "../shared";

export default async function Page({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  await requireUser(["ADMIN"]);
  const { edit } = await searchParams;
  const rows = await prisma.klasifikasi.findMany({ orderBy: { kode: "asc" } });
  const e = rows.find((r) => r.id === edit);
  return (
    <>
      <PageHeader title="Klasifikasi Surat" />
      <div className="grid gap-5 lg:grid-cols-3">
        <ActionForm action={simpanMaster} className="card space-y-3" key={e?.id ?? "baru"}>
          <h2 className="font-semibold">{e ? "Edit Klasifikasi" : "Tambah Klasifikasi"}</h2>
          <input type="hidden" name="entitas" value="klasifikasi" />
          {e && <input type="hidden" name="id" value={e.id} />}
          <div><label className="lbl">Kode</label><input name="kode" className="input" defaultValue={e?.kode} placeholder="mis. PP.01.01" required /></div>
          <div><label className="lbl">Nama</label><input name="nama" className="input" defaultValue={e?.nama} required /></div>
          <div><label className="lbl">Keterangan</label><textarea name="keterangan" className="input" rows={2} defaultValue={e?.keterangan ?? ""} /></div>
          <div className="flex gap-2"><SubmitButton>Simpan</SubmitButton>{e && <BatalLink />}</div>
        </ActionForm>
        <div className="card overflow-x-auto p-0 lg:col-span-2">
          <table className="tbl">
            <thead><tr><th>Kode</th><th>Nama</th><th>Keterangan</th><th /></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="font-mono">{r.kode}</td><td>{r.nama}</td><td className="text-slate-600">{r.keterangan}</td>
                  <td className="flex justify-end gap-1"><EditLink id={r.id} /><HapusButton entitas="klasifikasi" id={r.id} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
