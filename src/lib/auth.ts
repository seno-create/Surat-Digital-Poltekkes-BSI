import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { prisma } from "./prisma";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 60 * 60 * 10 },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Akun",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials.password) return null;
        const user = await prisma.user.findUnique({
          where: { username: credentials.username.trim().toLowerCase() },
        });
        if (!user || !user.aktif) return null;
        const ok = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!ok) return null;
        await prisma.auditLog.create({
          data: { userId: user.id, aksi: "LOGIN", entitas: "User", entitasId: user.id },
        });
        return { id: user.id, name: user.nama, role: user.role, unitId: user.unitId };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.uid = user.id;
        token.role = user.role;
        token.unitId = user.unitId ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      session.user = {
        ...session.user,
        id: token.uid,
        role: token.role,
        unitId: token.unitId,
      };
      return session;
    },
  },
};

export type SessionUser = { id: string; name: string; role: Role; unitId: string | null };

/** Ambil user yang login (server component / action). Redirect ke /login bila belum login. */
export async function requireUser(roles?: Role[]): Promise<SessionUser> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  const u = session.user;
  // pastikan akun masih aktif & role terbaru
  const db = await prisma.user.findUnique({ where: { id: u.id } });
  if (!db || !db.aktif) redirect("/login");
  const user: SessionUser = { id: db.id, name: db.nama, role: db.role, unitId: db.unitId };
  if (roles && !roles.includes(user.role)) redirect("/?error=akses");
  return user;
}

export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "Admin / TU",
  PIMPINAN: "Pimpinan",
  KEPALA_UNIT: "Kepala Unit",
  STAF: "Staf",
};
