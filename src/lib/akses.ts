import type { Prisma, Role } from "@prisma/client";
import type { SessionUser } from "./auth";
import { prisma } from "./prisma";

/** Filter surat masuk yang boleh dilihat user. Admin & pimpinan: semua; lainnya: yang pernah didisposisikan kepadanya. */
export function suratMasukScope(user: SessionUser): Prisma.SuratMasukWhereInput {
  if (user.role === "ADMIN" || user.role === "PIMPINAN") return {};
  return { disposisi: { some: { OR: [{ kepadaId: user.id }, { dariId: user.id }] } } };
}

export async function canViewSuratMasuk(user: SessionUser, id: string) {
  const n = await prisma.suratMasuk.count({ where: { id, ...suratMasukScope(user) } });
  return n > 0;
}

/** Role tujuan yang boleh menerima disposisi dari role tertentu (berjenjang). */
export const TUJUAN_DISPOSISI: Record<Role, Role[]> = {
  ADMIN: ["PIMPINAN"],
  PIMPINAN: ["KEPALA_UNIT", "STAF"],
  KEPALA_UNIT: ["STAF"],
  STAF: [],
};

export async function kandidatTujuanDisposisi(user: SessionUser) {
  const roles = TUJUAN_DISPOSISI[user.role];
  if (!roles.length) return [];
  return prisma.user.findMany({
    where: {
      aktif: true,
      role: { in: roles },
      id: { not: user.id },
      // Kepala unit hanya ke staf di unitnya sendiri (bila unit diisi)
      ...(user.role === "KEPALA_UNIT" && user.unitId ? { unitId: user.unitId } : {}),
    },
    include: { jabatan: true, unit: true },
    orderBy: [{ role: "asc" }, { nama: "asc" }],
  });
}

export function suratKeluarScope(user: SessionUser): Prisma.SuratKeluarWhereInput {
  if (user.role === "ADMIN" || user.role === "PIMPINAN") return {};
  if (user.role === "KEPALA_UNIT")
    return {
      OR: [
        { createdById: user.id },
        { verifikatorId: user.id },
        ...(user.unitId ? [{ unitId: user.unitId }] : []),
      ],
    };
  return { createdById: user.id };
}
