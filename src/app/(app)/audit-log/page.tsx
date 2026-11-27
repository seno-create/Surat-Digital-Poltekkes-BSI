import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { tglJam } from "@/lib/format";
import { PageHeader, Pagination } from "@/components/ui";

const PER_PAGE = 50;

export default async function Page({ searchParams }: { searchParams: Promise<{ entitas?: string; aksi?: string; page?: string }> }) {
  await requireUser(["ADMIN"]);
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const where = { ...(sp.entitas ? { entitas: sp.entitas } : {}), ...(sp.aksi ? { aksi: sp.aksi } : {}) };
  const [rows, total, entitas] = await Promise.all([
    prisma.auditLog.findMany({ where, include: { user: true }, orderBy: { createdAt: "desc" }, skip: (page - 1) * PER_PAGE, take: PER_PAGE }),
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({ distinct: ["entitas"], select: { entitas: true } }),
  ]);
  return (
    <>
      <PageHeader title="Audit Log" />
      <form className="card mb-4 flex flex-wrap gap-3">
        <select name="entitas" defaultValue={sp.entitas ?? ""} className="input max-w-xs">
          <option value="">Semua entitas</option>
          {entitas.map((e) => <option key={e.entitas}>{e.entitas}</option>)}
        </select>
        <input name="aksi" defaultValue={sp.aksi} placeholder="Aksi (mis. DELETE)" className="input max-w-xs" />
        <button className="btn-primary">Filter</button>
      </form>
      <div className="card overflow-x-auto p-0">
        <table className="tbl">
          <thead><tr><th>Waktu</th><th>Pengguna</th><th>Aksi</th><th>Entitas</th><th>Detail</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="whitespace-nowrap text-xs">{tglJam(r.createdAt)}</td>
                <td>{r.user?.nama ?? "-"}</td>
                <td className="font-mono text-xs">{r.aksi}</td>
                <td className="text-xs">{r.entitas}{r.entitasId && <div className="text-slate-400">{r.entitasId}</div>}</td>
                <td className="max-w-md break-all font-mono text-[11px] text-slate-600">{r.detail ? JSON.stringify(r.detail) : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} total={total} perPage={PER_PAGE} params={sp} />
    </>
  );
}
