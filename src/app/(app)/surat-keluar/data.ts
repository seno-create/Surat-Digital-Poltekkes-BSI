import { prisma } from "@/lib/prisma";
import { ROLE_LABEL } from "@/lib/auth";

export async function opsiForm() {
  const [klasifikasi, unit, verifikator, template] = await Promise.all([
    prisma.klasifikasi.findMany({ orderBy: { kode: "asc" } }),
    prisma.unit.findMany({ where: { aktif: true }, orderBy: { nama: "asc" } }),
    prisma.user.findMany({
      where: { aktif: true, role: { in: ["PIMPINAN", "KEPALA_UNIT"] } },
      include: { jabatan: true },
      orderBy: [{ role: "asc" }, { nama: "asc" }],
    }),
    prisma.templateSurat.findMany({ where: { aktif: true }, orderBy: { nama: "asc" } }),
  ]);
  return {
    klasifikasi: klasifikasi.map((k) => ({ id: k.id, label: `${k.kode} – ${k.nama}` })),
    unit: unit.map((u) => ({ id: u.id, label: `${u.kode} – ${u.nama}` })),
    verifikator: verifikator.map((v) => ({ id: v.id, label: `${v.nama} (${v.jabatan?.nama ?? ROLE_LABEL[v.role]})` })),
    template: template.map((t) => ({ id: t.id, nama: t.nama, isi: t.isi })),
  };
}
