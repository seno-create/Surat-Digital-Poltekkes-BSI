import { Readable } from "node:stream";
import { getServerSession } from "next-auth";
import { authOptions, type SessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { suratKeluarScope, suratMasukScope } from "@/lib/akses";
import { downloadFromDrive } from "@/lib/drive";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ fileId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });
  const db = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!db?.aktif) return new Response("Unauthorized", { status: 401 });
  const user: SessionUser = { id: db.id, name: db.nama, role: db.role, unitId: db.unitId };
  const { fileId } = await params;

  const [sm, sk] = await Promise.all([
    prisma.suratMasuk.count({ where: { fileId, ...suratMasukScope(user) } }),
    prisma.suratKeluar.count({ where: { fileId, ...suratKeluarScope(user) } }),
  ]);
  if (!sm && !sk) return new Response("Not found", { status: 404 });

  try {
    const { meta, stream } = await downloadFromDrive(fileId);
    return new Response(Readable.toWeb(stream) as ReadableStream, {
      headers: {
        "Content-Type": meta.mimeType || "application/octet-stream",
        "Content-Disposition": `inline; filename="${encodeURIComponent(meta.name || "file")}"`,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (e) {
    console.error(e);
    return new Response("Gagal mengambil file dari Google Drive", { status: 502 });
  }
}
