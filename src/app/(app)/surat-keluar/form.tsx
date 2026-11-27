"use client";

import { useRef } from "react";
import { ActionForm, SubmitButton } from "@/components/client";
import { simpanSuratKeluar } from "./actions";

type Opt = { id: string; label: string };
type Tpl = { id: string; nama: string; isi: string };
type Data = {
  id: string; klasifikasiId: string; unitId: string; templateId: string | null; tujuan: string; perihal: string;
  sifat: string; lampiran: string | null; isi: string; penandatangan: string | null; verifikatorId: string | null;
};

export function SuratKeluarForm({
  klasifikasi, unit, verifikator, template, defaultUnitId, data,
}: {
  klasifikasi: Opt[]; unit: Opt[]; verifikator: Opt[]; template: Tpl[]; defaultUnitId?: string | null; data?: Data;
}) {
  const isiRef = useRef<HTMLTextAreaElement>(null);
  return (
    <ActionForm action={simpanSuratKeluar} className="card max-w-4xl">
      {data && <input type="hidden" name="id" value={data.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="lbl">Template</label>
          <select
            name="templateId"
            className="input"
            defaultValue={data?.templateId ?? ""}
            onChange={(e) => {
              const t = template.find((x) => x.id === e.target.value);
              if (t && isiRef.current && (!isiRef.current.value.trim() || confirm("Ganti isi surat dengan template ini?"))) {
                isiRef.current.value = t.isi;
              }
            }}
          >
            <option value="">— Tanpa template —</option>
            {template.map((t) => <option key={t.id} value={t.id}>{t.nama}</option>)}
          </select>
        </div>
        <div>
          <label className="lbl">Klasifikasi *</label>
          <select name="klasifikasiId" className="input" defaultValue={data?.klasifikasiId ?? ""} required>
            <option value="">— Pilih —</option>
            {klasifikasi.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
          </select>
        </div>
        <div>
          <label className="lbl">Unit Pengolah *</label>
          <select name="unitId" className="input" defaultValue={data?.unitId ?? defaultUnitId ?? ""} required>
            <option value="">— Pilih —</option>
            {unit.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}
          </select>
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
        <div className="sm:col-span-2">
          <label className="lbl">Tujuan (Yth.) *</label>
          <input name="tujuan" className="input" defaultValue={data?.tujuan} required />
        </div>
        <div className="sm:col-span-2">
          <label className="lbl">Perihal *</label>
          <input name="perihal" className="input" defaultValue={data?.perihal} required />
        </div>
        <div>
          <label className="lbl">Lampiran</label>
          <input name="lampiran" className="input" defaultValue={data?.lampiran ?? ""} placeholder="mis. 1 (satu) berkas" />
        </div>
        <div>
          <label className="lbl">Penandatangan</label>
          <input name="penandatangan" className="input" defaultValue={data?.penandatangan ?? ""} placeholder="Nama & jabatan penandatangan" />
        </div>
        <div className="sm:col-span-2">
          <label className="lbl">Isi Surat *</label>
          <textarea ref={isiRef} name="isi" rows={14} className="input font-serif" defaultValue={data?.isi} required />
          <p className="mt-1 text-xs text-slate-500">
            Placeholder otomatis saat dicetak: {"{{nomor}} {{tanggal}} {{tujuan}} {{perihal}} {{lampiran}} {{sifat}} {{penandatangan}}"}
          </p>
        </div>
        <div>
          <label className="lbl">Verifikator (untuk diajukan)</label>
          <select name="verifikatorId" className="input" defaultValue={data?.verifikatorId ?? ""}>
            <option value="">— Pilih —</option>
            {verifikator.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
          </select>
        </div>
      </div>
      <div className="mt-5 flex gap-2">
        <SubmitButton name="aksi" value="draft" className="btn-secondary">Simpan Draft</SubmitButton>
        <SubmitButton name="aksi" value="ajukan">Ajukan Verifikasi</SubmitButton>
      </div>
    </ActionForm>
  );
}
