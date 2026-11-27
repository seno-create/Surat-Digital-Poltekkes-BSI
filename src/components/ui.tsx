import Link from "next/link";
import { label } from "@/lib/format";

const WARNA: Record<string, string> = {
  BIASA: "bg-slate-100 text-slate-700",
  PENTING: "bg-amber-100 text-amber-800",
  SEGERA: "bg-orange-100 text-orange-800",
  RAHASIA: "bg-red-100 text-red-800",
  BARU: "bg-sky-100 text-sky-800",
  DIDISPOSISI: "bg-indigo-100 text-indigo-800",
  SELESAI: "bg-emerald-100 text-emerald-800",
  DIARSIPKAN: "bg-slate-200 text-slate-700",
  BELUM_DIBACA: "bg-red-100 text-red-800",
  DIBACA: "bg-sky-100 text-sky-800",
  DIPROSES: "bg-amber-100 text-amber-800",
  DRAFT: "bg-slate-100 text-slate-700",
  MENUNGGU_VERIFIKASI: "bg-amber-100 text-amber-800",
  REVISI: "bg-orange-100 text-orange-800",
  DISETUJUI: "bg-emerald-100 text-emerald-800",
  DITOLAK: "bg-red-100 text-red-800",
  TERKIRIM: "bg-indigo-100 text-indigo-800",
};

export function Badge({ value }: { value: string }) {
  return <span className={`badge ${WARNA[value] ?? "bg-slate-100"}`}>{label(value)}</span>;
}

export function PageHeader({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <h1 className="page-title">{title}</h1>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

export function Pagination({
  page,
  total,
  perPage,
  params,
}: {
  page: number;
  total: number;
  perPage: number;
  params: Record<string, string | undefined>;
}) {
  const pages = Math.max(1, Math.ceil(total / perPage));
  const href = (p: number) => {
    const sp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => v && k !== "page" && sp.set(k, v));
    sp.set("page", String(p));
    return `?${sp.toString()}`;
  };
  return (
    <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
      <span>
        Total {total} data · Halaman {page} dari {pages}
      </span>
      <div className="flex gap-2">
        {page > 1 && <Link className="btn-secondary btn-sm" href={href(page - 1)}>‹ Sebelumnya</Link>}
        {page < pages && <Link className="btn-secondary btn-sm" href={href(page + 1)}>Berikutnya ›</Link>}
      </div>
    </div>
  );
}

export function Field({ label: l, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{l}</dt>
      <dd className="mt-0.5 text-sm text-slate-800">{children}</dd>
    </div>
  );
}

export function Empty({ text = "Belum ada data." }: { text?: string }) {
  return <p className="py-8 text-center text-sm text-slate-500">{text}</p>;
}
