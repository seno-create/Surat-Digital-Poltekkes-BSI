import { requireUser, ROLE_LABEL } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/client";
import { simpanPengguna } from "../actions";
import { BatalLink, EditLink } from "../shared";

export default async function Page({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  await requireUser(["ADMIN"]);
  const { edit } = await searchParams;
  const [rows, unit, jabatan] = await Promise.all([
    prisma.user.findMany({ include: { unit: true, jabatan: true }, orderBy: [{ aktif: "desc" }, { role: "asc" }, { nama: "asc" }] }),
    prisma.unit.findMany({ orderBy: { nama: "asc" } }),
    prisma.jabatan.findMany({ orderBy: [{ level: "asc" }, { nama: "asc" }] }),
  ]);
  const e = rows.find((r) => r.id === edit);
  return (
    <>
      <PageHeader title="Pengguna" />
      <ActionForm action={simpanPengguna} className="card mb-5" key={e?.id ?? "baru"}>
        <h2 className="mb-3 font-semibold">{e ? `Edit ${e.nama}` : "Tambah Pengguna"}</h2>
        {e && <input type="hidden" name="id" value={e.id} />}
        <div className="grid gap-3 sm:grid-cols-4">
          <div><label className="lbl">Username *</label><input name="username" className="input" defaultValue={e?.username} required /></div>
          <div className="sm:col-span-2"><label className="lbl">Nama Lengkap *</label><input name="nama" className="input" defaultValue={e?.nama} required /></div>
          <div><label className="lbl">NIP</label><input name="nip" className="input" defaultValue={e?.nip ?? ""} /></div>
          <div><label className="lbl">Email</label><input type="email" name="email" className="input" defaultValue={e?.email ?? ""} /></div>
          <div>
            <label className="lbl">Role *</label>
            <select name="role" className="input" defaultValue={e?.role ?? "STAF"}>
              {Object.entries(ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="lbl">Unit</label>
            <select name="unitId" className="input" defaultValue={e?.unitId ?? ""}>
              <option value="">—</option>
              {unit.map((u) => <option key={u.id} value={u.id}>{u.nama}</option>)}
            </select>
          </div>
          <div>
            <label className="lbl">Jabatan</label>
            <select name="jabatanId" className="input" defaultValue={e?.jabatanId ?? ""}>
              <option value="">—</option>
              {jabatan.map((j) => <option key={j.id} value={j.id}>{j.nama}</option>)}
            </select>
          </div>
          <div><label className="lbl">{e ? "Password baru (kosongkan bila tetap)" : "Password *"}</label><input type="password" name="password" className="input" autoComplete="new-password" /></div>
          <label className="flex items-center gap-2 self-end pb-2 text-sm"><input type="checkbox" name="aktif" defaultChecked={e?.aktif ?? true} /> Aktif</label>
        </div>
        <div className="mt-4 flex gap-2"><SubmitButton>Simpan</SubmitButton>{e && <BatalLink />}</div>
      </ActionForm>
      <div className="card overflow-x-auto p-0">
        <table className="tbl">
          <thead><tr><th>Nama</th><th>Username</th><th>Role</th><th>Jabatan</th><th>Unit</th><th>Status</th><th /></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className={r.aktif ? "" : "text-slate-400"}>
                <td>{r.nama}{r.nip && <div className="text-xs text-slate-500">NIP {r.nip}</div>}</td>
                <td className="font-mono text-xs">{r.username}</td>
                <td>{ROLE_LABEL[r.role]}</td>
                <td>{r.jabatan?.nama ?? "-"}</td>
                <td>{r.unit?.nama ?? "-"}</td>
                <td>{r.aktif ? "Aktif" : "Nonaktif"}</td>
                <td className="text-right"><EditLink id={r.id} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
