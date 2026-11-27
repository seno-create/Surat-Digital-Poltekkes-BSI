import type { Disposisi } from "@prisma/client";
import { ActionForm, SubmitButton } from "@/components/client";
import { tanggapiDisposisi } from "./actions";

export function TanggapanForm({ d }: { d: Disposisi }) {
  return (
    <ActionForm action={tanggapiDisposisi} className="space-y-3">
      <input type="hidden" name="id" value={d.id} />
      <div>
        <label className="lbl">Tanggapan / Laporan Tindak Lanjut</label>
        <textarea name="tanggapan" rows={3} className="input" defaultValue={d.tanggapan ?? ""} />
      </div>
      <div className="flex gap-2">
        <SubmitButton name="status" value="DIPROSES" className="btn-secondary">Tandai Sedang Diproses</SubmitButton>
        <SubmitButton name="status" value="SELESAI">Tandai Selesai</SubmitButton>
      </div>
    </ActionForm>
  );
}
