import type { Klasifikasi, SuratMasuk } from "@prisma/client";
import { ActionForm, SubmitButton, type FormState } from "@/components/client";
import { inputDate, todayJakarta } from "@/lib/format";

export function SuratMasukForm({
  action,
  klasifikasi,
  data,
}: {
  action: (s: FormState, fd: FormData) => Promise<FormState>;
  klasifikasi: Klasifikasi[];
  data?: SuratMasuk;
}) {
  return (
    <ActionForm action={action} className="card max-w-3xl">
      {data && <input type="hidden" name="id" value={data.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="lbl">Nomor Surat *</label>
          <input name="nomorSurat" className="input" defaultValue={data?.nomorSurat} required />
        </div>
        <div>
          <label className="lbl">Pengirim / Asal Surat *</label>
          <input name="pengirim" className="input" defaultValue={data?.pengirim} required />
        </div>
        <div>
          <label className="lbl">Tanggal Surat *</label>
          <input type="date" name="tanggalSurat" className="input" defaultValue={inputDate(data?.tanggalSurat)} required />
        </div>
        <div>
          <label className="lbl">Tanggal Diterima *</label>
          <input type="date" name="tanggalTerima" className="input" defaultValue={inputDate(data?.tanggalTerima ?? todayJakarta())} required />
        </div>
        <div className="sm:col-span-2">
          <label className="lbl">Perihal *</label>
          <input name="perihal" className="input" defaultValue={data?.perihal} required />
        </div>
        <div>
          <label className="lbl">Sifat</label>
          <select name="sifat" className="input" defaultValue={data?.sifat ?? "BIASA"}>
            <option value="BIASA">Biasa</option>
            <option value="PENTING">Penting</option>
            <option value="SEGERA">Segera</option>
            <option value="RAHASIA">Rahasia</option>
          </select>
        </div>
        <div>
          <label className="lbl">Klasifikasi</label>
          <select name="klasifikasiId" className="input" defaultValue={data?.klasifikasiId ?? ""}>
            <option value="">— Pilih —</option>
            {klasifikasi.map((k) => (
              <option key={k.id} value={k.id}>{k.kode} – {k.nama}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="lbl">Lampiran</label>
          <input name="lampiran" className="input" placeholder="mis. 1 berkas" defaultValue={data?.lampiran ?? ""} />
        </div>
        <div>
          <label className="lbl">Scan Surat (PDF/JPG/PNG, maks 4 MB)</label>
          <input type="file" name="file" accept="application/pdf,image/*" className="input py-1.5" />
          {data?.fileName && <p className="mt-1 text-xs text-slate-500">File saat ini: {data.fileName}. Unggah baru untuk mengganti.</p>}
        </div>
        <div className="sm:col-span-2">
          <label className="lbl">Ringkasan Isi</label>
          <textarea name="ringkasan" rows={3} className="input" defaultValue={data?.ringkasan ?? ""} />
        </div>
      </div>
      <div className="mt-5 flex gap-2">
        <SubmitButton>{data ? "Simpan Perubahan" : "Simpan & Buat Nomor Agenda"}</SubmitButton>
      </div>
    </ActionForm>
  );
}
