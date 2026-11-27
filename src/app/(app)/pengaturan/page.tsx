import { requireUser } from "@/lib/auth";
import { driveConfigured, testDrive } from "@/lib/drive";
import { PageHeader } from "@/components/ui";

export default async function Page({ searchParams }: { searchParams: Promise<{ tes?: string }> }) {
  await requireUser(["ADMIN"]);
  const { tes } = await searchParams;
  let hasil: { ok: boolean; pesan: string } | null = null;
  if (tes) {
    try {
      const d = await testDrive();
      hasil = { ok: true, pesan: `Berhasil terhubung ke folder/Shared Drive "${d.name}"${d.driveId ? " (Shared Drive)" : ""}.` };
    } catch (e) {
      hasil = { ok: false, pesan: e instanceof Error ? e.message : String(e) };
    }
  }
  const env = [
    ["DATABASE_URL", !!process.env.DATABASE_URL],
    ["NEXTAUTH_SECRET", !!process.env.NEXTAUTH_SECRET],
    ["NEXTAUTH_URL", !!process.env.NEXTAUTH_URL],
    ["GOOGLE_SERVICE_ACCOUNT_EMAIL", !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL],
    ["GOOGLE_PRIVATE_KEY", !!process.env.GOOGLE_PRIVATE_KEY],
    ["GOOGLE_DRIVE_ROOT_ID", !!process.env.GOOGLE_DRIVE_ROOT_ID],
    ["INSTANSI_NAMA", !!process.env.INSTANSI_NAMA],
  ] as const;
  return (
    <>
      <PageHeader title="Pengaturan Sistem" />
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="card">
          <h2 className="mb-3 font-semibold">Variabel Lingkungan</h2>
          <ul className="space-y-1 text-sm">
            {env.map(([k, ok]) => (
              <li key={k} className="flex justify-between"><span className="font-mono">{k}</span><span className={ok ? "text-emerald-600" : "text-red-600"}>{ok ? "terisi" : "kosong"}</span></li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-slate-500">Format nomor surat keluar: <span className="font-mono">{process.env.FORMAT_NOMOR_SURAT || "{urut}/{klasifikasi}/{unit}/{bulan_romawi}/{tahun}"}</span></p>
        </div>
        <div className="card">
          <h2 className="mb-3 font-semibold">Google Drive</h2>
          <p className="mb-3 text-sm text-slate-600">
            File scan disimpan di Shared Drive dengan struktur folder otomatis: <span className="font-mono">Surat Masuk/2026/11 - November</span>.
          </p>
          {!driveConfigured() && <p className="mb-3 text-sm text-red-600">Google Drive belum dikonfigurasi.</p>}
          <a href="?tes=1" className="btn-secondary">Tes Koneksi Google Drive</a>
          {hasil && <p className={`mt-3 text-sm ${hasil.ok ? "text-emerald-700" : "text-red-600"}`}>{hasil.pesan}</p>}
        </div>
      </div>
    </>
  );
}
