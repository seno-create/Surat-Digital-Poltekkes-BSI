export const BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

export function tgl(d: Date | string | null | undefined) {
  if (!d) return "-";
  const x = typeof d === "string" ? new Date(d) : d;
  return `${x.getUTCDate()} ${BULAN[x.getUTCMonth()]} ${x.getUTCFullYear()}`;
}

export function tglJam(d: Date | string | null | undefined) {
  if (!d) return "-";
  const x = typeof d === "string" ? new Date(d) : d;
  return x.toLocaleString("id-ID", { timeZone: "Asia/Jakarta", dateStyle: "medium", timeStyle: "short" });
}

export function inputDate(d: Date | null | undefined) {
  if (!d) return "";
  return d.toISOString().slice(0, 10);
}

/** "2026-11-27" -> Date UTC tengah malam (cocok untuk kolom @db.Date) */
export function parseDate(v: FormDataEntryValue | null): Date | null {
  if (!v || typeof v !== "string" || !v.trim()) return null;
  const d = new Date(`${v}T00:00:00.000Z`);
  return isNaN(d.getTime()) ? null : d;
}

export function str(v: FormDataEntryValue | null): string {
  return typeof v === "string" ? v.trim() : "";
}

export function strOrNull(v: FormDataEntryValue | null): string | null {
  const s = str(v);
  return s ? s : null;
}

export function label(s: string) {
  return s
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function todayJakarta(): Date {
  const s = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
  return new Date(`${s}T00:00:00.000Z`);
}
