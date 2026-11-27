import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

export async function audit(
  userId: string | null,
  aksi: string,
  entitas: string,
  entitasId?: string | null,
  detail?: Prisma.InputJsonValue,
) {
  try {
    await prisma.auditLog.create({ data: { userId, aksi, entitas, entitasId, detail } });
  } catch (e) {
    console.error("Gagal menulis audit log", e);
  }
}
