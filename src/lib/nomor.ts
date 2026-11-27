import type { Prisma } from "@prisma/client";

const ROMAWI = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

/** Naikkan counter secara atomik di dalam transaksi dan kembalikan nilai baru. */
export async function nextCounter(tx: Prisma.TransactionClient, key: string): Promise<number> {
  const rows = await tx.$queryRaw<{ value: number }[]>`
    INSERT INTO "Counter" ("key", "value") VALUES (${key}, 1)
    ON CONFLICT ("key") DO UPDATE SET "value" = "Counter"."value" + 1
    RETURNING "value"`;
  return Number(rows[0].value);
}

export function formatNomorAgenda(urut: number, tahun: number) {
  return `${String(urut).padStart(4, "0")}/SM/${tahun}`;
}

export function formatNomorSurat(opts: {
  urut: number;
  klasifikasi: string;
  unit: string;
  tanggal: Date;
}) {
  const fmt = process.env.FORMAT_NOMOR_SURAT || "{urut}/{klasifikasi}/{unit}/{bulan_romawi}/{tahun}";
  const bulan = opts.tanggal.getMonth();
  return fmt
    .replace("{urut}", String(opts.urut).padStart(3, "0"))
    .replace("{klasifikasi}", opts.klasifikasi)
    .replace("{unit}", opts.unit)
    .replace("{bulan_romawi}", ROMAWI[bulan])
    .replace("{bulan}", String(bulan + 1).padStart(2, "0"))
    .replace("{tahun}", String(opts.tanggal.getFullYear()));
}
