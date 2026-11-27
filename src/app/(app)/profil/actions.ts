"use server";

import bcrypt from "bcryptjs";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { str } from "@/lib/format";
import type { FormState } from "@/components/client";

export async function gantiPassword(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const lama = str(fd.get("lama"));
  const baru = str(fd.get("baru"));
  const ulang = str(fd.get("ulang"));
  if (baru.length < 8) return { error: "Password baru minimal 8 karakter." };
  if (baru !== ulang) return { error: "Konfirmasi password tidak sama." };
  const db = await prisma.user.findUnique({ where: { id: user.id } });
  if (!db || !(await bcrypt.compare(lama, db.passwordHash))) return { error: "Password lama salah." };
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(baru, 10) } });
  await audit(user.id, "GANTI_PASSWORD", "User", user.id);
  return { ok: "Password berhasil diganti." };
}
