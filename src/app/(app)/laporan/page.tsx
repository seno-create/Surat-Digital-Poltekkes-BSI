import { requireUser } from "@/lib/auth";
import { dataLaporan, periode, rekap, type Jenis } from "@/lib/laporan";
import { inputDate, tgl } from "@/lib/format";
import { Empty, PageHeader } from "@/components/ui";

type SP = { jenis?: string; dari?: string; sampai?: string };

export default async function Page({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const jenis: Jenis = sp.jenis === "keluar" ? "keluar" : "masuk";
  const { dari, sampai } = periode(sp);
  const rows = await dataLaporan(user, jenis, dari, sampai);
  const qs = new URLSearchParams({ jenis, dari: inputDate(dari), sampai: inputDate(sampai) }).toString();

  const kotak = (judul: string, data: [string, number][]) => (
    <div className="card">
      <h3 className="mb-2 text-sm font-semibold text-slate-600">{judul}</h3>
      {data.length === 0 ? <p className="text-sm text-slate-400">-</p> : (
        <ul className="space-y-1 text-sm">
          {data.map(([k, v]) => (
            <li key={k} className="flex justify-between"><span>{k}</span><b>{v}</b></li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <>
      <PageHeader title="Laporan & Rekap">
        <a href={`/api/laporan/excel?${qs}`} className="btn-secondary">Export Excel</a>
        <a href={`/api/laporan/pdf?${qs}`} className="btn-secondary" target="_blank">Export PDF</a>
      </PageHeader>
      <form className="card mb-5 flex flex-wrap items-end gap-3">
        <div>
          <label className="lbl">Jenis</label>
          <select name="jenis" defaultValue={jenis} className="input">
            <option value="masuk">Surat Masuk</option>
            <option value="keluar">Surat Keluar</option>
          </select>
        </div>
        <div><label className="lbl">Dari</label><input type="date" name="dari" defaultValue={inputDate(dari)} className="input" /></div>
        <div><label className="lbl">Sampai</label><input type="date" name="sampai" defaultValue={inputDate(sampai)} className="input" /></div>
        <button className="btn-primary">Tampilkan</button>
      </form>

      <p className="mb-3 text-sm text-slate-600">
        {jenis === "masuk" ? "Surat masuk" : "Surat keluar"} periode {tgl(dari)} s.d. {tgl(sampai)}: <b>{rows.length}</b> surat
      </p>
      <div className="mb-5 grid gap-4 md:grid-cols-3">
        {kotak("Per Sifat", rekap(rows, "sifat"))}
        {kotak("Per Status", rekap(rows, "status"))}
        {kotak("Per Klasifikasi", rekap(rows, "klasifikasi").slice(0, 10))}
      </div>
      <div className="card overflow-x-auto p-0">
        {rows.length === 0 ? <Empty /> : (
          <table className="tbl">
            <thead><tr><th>No</th><th>Nomor</th><th>Tanggal</th><th>{jenis === "masuk" ? "Pengirim" : "Tujuan"}</th><th>Perihal</th><th>Klasifikasi</th><th>Sifat</th><th>Status</th></tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}><td>{i + 1}</td><td className="font-mono text-xs">{r.nomor}</td><td className="whitespace-nowrap">{r.tanggal}</td><td>{r.pihak}</td><td>{r.perihal}</td><td>{r.klasifikasi}</td><td>{r.sifat}</td><td>{r.status}</td></tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
