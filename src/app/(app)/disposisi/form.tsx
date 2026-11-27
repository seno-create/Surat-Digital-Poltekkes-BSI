import type { Jabatan, Unit, User } from "@prisma/client";
import { ActionForm, SubmitButton } from "@/components/client";
import { ROLE_LABEL } from "@/lib/auth";
import { buatDisposisi } from "./actions";

export const INSTRUKSI = [
  "Untuk diketahui",
  "Untuk ditindaklanjuti",
  "Untuk dipelajari dan ditelaah",
  "Untuk diproses sesuai ketentuan",
  "Siapkan jawaban / konsep surat",
  "Untuk dihadiri / diwakili",
  "Koordinasikan dengan unit terkait",
  "Untuk diarsipkan",
];

type Kandidat = User & { jabatan: Jabatan | null; unit: Unit | null };

export function DisposisiForm({ suratMasukId, kandidat }: { suratMasukId: string; kandidat: Kandidat[] }) {
  return (
    <ActionForm action={buatDisposisi} className="space-y-4">
      <input type="hidden" name="suratMasukId" value={suratMasukId} />
      <div>
        <p className="lbl">Diteruskan kepada *</p>
        <div className="grid max-h-56 gap-1 overflow-y-auto rounded-md border border-slate-200 p-2 sm:grid-cols-2">
          {kandidat.map((k) => (
            <label key={k.id} className="flex items-start gap-2 rounded px-1 py-1 text-sm hover:bg-slate-50">
              <input type="checkbox" name="kepadaId" value={k.id} className="mt-1" />
              <span>
                {k.nama}
                <span className="block text-xs text-slate-500">
                  {k.jabatan?.nama ?? ROLE_LABEL[k.role]}
                  {k.unit ? ` · ${k.unit.nama}` : ""}
                </span>
              </span>
            </label>
          ))}
        </div>
      </div>
      <div>
        <p className="lbl">Instruksi *</p>
        <div className="grid gap-1 sm:grid-cols-2">
          {INSTRUKSI.map((i) => (
            <label key={i} className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="instruksi" value={i} /> {i}
            </label>
          ))}
        </div>
        <input name="instruksiLain" className="input mt-2" placeholder="Instruksi lain (opsional)" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="lbl">Batas Waktu</label>
          <input type="date" name="batasWaktu" className="input" />
        </div>
        <div>
          <label className="lbl">Catatan</label>
          <input name="catatan" className="input" />
        </div>
      </div>
      <SubmitButton>Kirim Disposisi</SubmitButton>
    </ActionForm>
  );
}
