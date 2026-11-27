import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/client";
import { simpanMaster } from "../actions";
import { BatalLink, EditLink, HapusButton } from "../shared";

export default async function Page({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  await requireUser(["ADMIN"]);
  const { edit } = await searchParams;
  const rows = await prisma.templateSurat.findMany({ orderBy: { nama: "asc" } });
  const e = rows.find((r) => r.id === edit);
  return (
    <>
      <PageHeader title="Template Surat" />
      <ActionForm action={simpanMaster} className="card mb-5 space-y-3" key={e?.id ?? "baru"}>
        <h2 className="font-semibold">{e ? "Edit Template" : "Tambah Template"}</h2>
        <input type="hidden" name="entitas" value="template" />
        {e && <input type="hidden" name="id" value={e.id} />}
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className="lbl">Nama Template</label><input name="nama" className="input" defaultValue={e?.nama} required /></div>
          <div><label className="lbl">Jenis</label><input name="jenis" className="input" defaultValue={e?.jenis ?? "Surat Dinas"} /></div>
        </div>
        <div>
          <label className="lbl">Isi</label>
          <textarea name="isi" rows={10} className="input font-serif" defaultValue={e?.isi} required />
          <p className="mt-1 text-xs text-slate-500">Placeholder: {"{{nomor}} {{tanggal}} {{tujuan}} {{perihal}} {{lampiran}} {{sifat}} {{penandatangan}}"}</p>
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="aktif" defaultChecked={e?.aktif ?? true} /> Aktif</label>
        <div className="flex gap-2"><SubmitButton>Simpan</SubmitButton>{e && <BatalLink />}</div>
      </ActionForm>
      <div className="card overflow-x-auto p-0">
        <table className="tbl">
          <thead><tr><th>Nama</th><th>Jenis</th><th>Status</th><th /></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.nama}</td><td>{r.jenis}</td><td>{r.aktif ? "Aktif" : "Nonaktif"}</td>
                <td className="flex justify-end gap-1"><EditLink id={r.id} /><HapusButton entitas="template" id={r.id} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
