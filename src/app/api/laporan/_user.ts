import { getServerSession } from "next-auth";
import { authOptions, type SessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function userDariSession(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const db = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!db?.aktif) return null;
  return { id: db.id, name: db.nama, role: db.role, unitId: db.unitId };
}
