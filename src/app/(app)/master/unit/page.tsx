import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/client";
import { simpanMaster } from "../actions";
import { BatalLink, EditLink, HapusButton } from "../shared";

export default async function Page({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  await requireUser(["ADMIN"]);
  const { edit } = await searchParams;
  const rows = await prisma.unit.findMany({ orderBy: { kode: "asc" }, include: { _count: { select: { users: true } } } });
  const e = rows.find((r) => r.id === edit);
  return (
    <>
      <PageHeader title="Unit Kerja" />
      <div className="grid gap-5 lg:grid-cols-3">
        <ActionForm action={simpanMaster} className="card space-y-3" key={e?.id ?? "baru"}>
          <h2 className="font-semibold">{e ? "Edit Unit" : "Tambah Unit"}</h2>
          <input type="hidden" name="entitas" value="unit" />
          {e && <input type="hidden" name="id" value={e.id} />}
          <div><label className="lbl">Kode (dipakai di nomor surat)</label><input name="kode" className="input" defaultValue={e?.kode} placeholder="mis. TU, KEP, AKD" required /></div>
          <div><label className="lbl">Nama Unit</label><input name="nama" className="input" defaultValue={e?.nama} required /></div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="aktif" defaultChecked={e?.aktif ?? true} /> Aktif</label>
          <div className="flex gap-2"><SubmitButton>Simpan</SubmitButton>{e && <BatalLink />}</div>
        </ActionForm>
        <div className="card overflow-x-auto p-0 lg:col-span-2">
          <table className="tbl">
            <thead><tr><th>Kode</th><th>Nama</th><th>Pegawai</th><th>Status</th><th /></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="font-mono">{r.kode}</td><td>{r.nama}</td><td>{r._count.users}</td>
                  <td>{r.aktif ? "Aktif" : "Nonaktif"}</td>
                  <td className="flex justify-end gap-1"><EditLink id={r.id} /><HapusButton entitas="unit" id={r.id} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
