import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/client";
import { simpanMaster } from "../actions";
import { BatalLink, EditLink, HapusButton } from "../shared";

const LEVEL: Record<number, string> = { 1: "Pimpinan", 2: "Kepala Unit", 3: "Staf" };

export default async function Page({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  await requireUser(["ADMIN"]);
  const { edit } = await searchParams;
  const rows = await prisma.jabatan.findMany({ orderBy: [{ level: "asc" }, { nama: "asc" }] });
  const e = rows.find((r) => r.id === edit);
  return (
    <>
      <PageHeader title="Jabatan" />
      <div className="grid gap-5 lg:grid-cols-3">
        <ActionForm action={simpanMaster} className="card space-y-3" key={e?.id ?? "baru"}>
          <h2 className="font-semibold">{e ? "Edit Jabatan" : "Tambah Jabatan"}</h2>
          <input type="hidden" name="entitas" value="jabatan" />
          {e && <input type="hidden" name="id" value={e.id} />}
          <div><label className="lbl">Nama Jabatan</label><input name="nama" className="input" defaultValue={e?.nama} required /></div>
          <div>
            <label className="lbl">Level</label>
            <select name="level" className="input" defaultValue={e?.level ?? 3}>
              <option value={1}>1 – Pimpinan</option><option value={2}>2 – Kepala Unit</option><option value={3}>3 – Staf</option>
            </select>
          </div>
          <div className="flex gap-2"><SubmitButton>Simpan</SubmitButton>{e && <BatalLink />}</div>
        </ActionForm>
        <div className="card overflow-x-auto p-0 lg:col-span-2">
          <table className="tbl">
            <thead><tr><th>Nama</th><th>Level</th><th /></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.nama}</td><td>{LEVEL[r.level] ?? r.level}</td>
                  <td className="flex justify-end gap-1"><EditLink id={r.id} /><HapusButton entitas="jabatan" id={r.id} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
