import { requireUser, ROLE_LABEL } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Nav, type NavGroup } from "@/components/nav";
import { LogoutButton } from "@/components/client";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const [disposisiBaru, menungguVerif] = await Promise.all([
    prisma.disposisi.count({ where: { kepadaId: user.id, status: "BELUM_DIBACA" } }),
    user.role === "PIMPINAN" || user.role === "KEPALA_UNIT" || user.role === "ADMIN"
      ? prisma.suratKeluar.count({
          where: { status: "MENUNGGU_VERIFIKASI", ...(user.role === "ADMIN" ? {} : { verifikatorId: user.id }) },
        })
      : Promise.resolve(0),
  ]);

  const groups: NavGroup[] = [
    {
      items: [
        { href: "/", label: "Dashboard" },
        { href: "/surat-masuk", label: "Surat Masuk" },
        { href: "/disposisi", label: "Disposisi Saya", badge: disposisiBaru },
        { href: "/surat-keluar", label: "Surat Keluar", badge: menungguVerif },
        { href: "/arsip", label: "Arsip" },
        { href: "/laporan", label: "Laporan" },
      ],
    },
  ];
  if (user.role === "ADMIN") {
    groups.push({
      title: "Master Data",
      items: [
        { href: "/master/pengguna", label: "Pengguna" },
        { href: "/master/unit", label: "Unit Kerja" },
        { href: "/master/jabatan", label: "Jabatan" },
        { href: "/master/klasifikasi", label: "Klasifikasi Surat" },
        { href: "/master/template", label: "Template Surat" },
        { href: "/audit-log", label: "Audit Log" },
        { href: "/pengaturan", label: "Pengaturan" },
      ],
    });
  }
  groups.push({ title: "Akun", items: [{ href: "/profil", label: "Profil & Password" }] });

  return (
    <div className="flex min-h-screen">
      <aside className="no-print sticky top-0 flex h-screen w-60 shrink-0 flex-col bg-brand-800 px-3 py-5 text-white">
        <div className="mb-6 px-3">
          <p className="text-sm font-bold leading-tight">Persuratan Dinas</p>
          <p className="text-xs text-brand-100/80">{process.env.INSTANSI_NAMA || "Politeknik Kesehatan"}</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          <Nav groups={groups} />
        </div>
        <div className="mt-4 border-t border-white/10 px-3 pt-3">
          <p className="truncate text-sm font-medium">{user.name}</p>
          <p className="mb-1 text-xs text-brand-100/80">{ROLE_LABEL[user.role]}</p>
          <LogoutButton />
        </div>
      </aside>
      <main className="min-w-0 flex-1 p-6">{children}</main>
    </div>
  );
}
