import { Readable } from "node:stream";
import { drive as driveApi, auth, type drive_v3 } from "@googleapis/drive";
import { BULAN } from "./format";

let client: drive_v3.Drive | null = null;

export function driveConfigured() {
  return Boolean(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
      process.env.GOOGLE_PRIVATE_KEY &&
      process.env.GOOGLE_DRIVE_ROOT_ID,
  );
}

function getDrive(): drive_v3.Drive {
  if (client) return client;
  if (!driveConfigured()) {
    throw new Error(
      "Google Drive belum dikonfigurasi. Isi GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, dan GOOGLE_DRIVE_ROOT_ID.",
    );
  }
  const jwt = new auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY!.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/drive"],
  });
  client = driveApi({ version: "v3", auth: jwt });
  return client;
}

const ROOT = () => process.env.GOOGLE_DRIVE_ROOT_ID!;
const folderCache = new Map<string, string>();

function escapeQ(s: string) {
  return s.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

/** Cari atau buat sub-folder bernama `name` di dalam `parentId` (mendukung Shared Drive). */
async function ensureFolder(parentId: string, name: string): Promise<string> {
  const cacheKey = `${parentId}/${name}`;
  const cached = folderCache.get(cacheKey);
  if (cached) return cached;

  const drive = getDrive();
  const res = await drive.files.list({
    q: `'${parentId}' in parents and name = '${escapeQ(name)}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: "files(id, name)",
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
    pageSize: 1,
  });
  let id = res.data.files?.[0]?.id;
  if (!id) {
    const created = await drive.files.create({
      requestBody: { name, mimeType: "application/vnd.google-apps.folder", parents: [parentId] },
      fields: "id",
      supportsAllDrives: true,
    });
    id = created.data.id!;
  }
  folderCache.set(cacheKey, id);
  return id;
}

/** Pastikan jalur folder, mis. ["Surat Masuk", "2026", "11 - November"], dan kembalikan ID folder terakhir. */
export async function ensurePath(parts: string[]): Promise<string> {
  let parent = ROOT();
  for (const p of parts) parent = await ensureFolder(parent, p);
  return parent;
}

export function folderParts(kategori: "Surat Masuk" | "Surat Keluar", tanggal: Date) {
  const m = tanggal.getUTCMonth();
  return [kategori, String(tanggal.getUTCFullYear()), `${String(m + 1).padStart(2, "0")} - ${BULAN[m]}`];
}

export type UploadResult = { fileId: string; fileName: string; fileUrl: string };

export async function uploadToDrive(
  file: File,
  kategori: "Surat Masuk" | "Surat Keluar",
  tanggal: Date,
  namaFile: string,
): Promise<UploadResult> {
  const drive = getDrive();
  const folderId = await ensurePath(folderParts(kategori, tanggal));
  const ext = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")) : "";
  const name = `${namaFile}${ext}`.replace(/[\\/:*?"<>|]/g, "-");
  const buf = Buffer.from(await file.arrayBuffer());
  const res = await drive.files.create({
    requestBody: { name, parents: [folderId] },
    media: { mimeType: file.type || "application/octet-stream", body: Readable.from(buf) },
    fields: "id, name, webViewLink",
    supportsAllDrives: true,
  });
  return {
    fileId: res.data.id!,
    fileName: res.data.name ?? name,
    fileUrl: res.data.webViewLink ?? `https://drive.google.com/file/d/${res.data.id}/view`,
  };
}

/** Unduh file dari Drive sebagai stream (dipakai oleh /api/files/[id] agar akses tetap lewat aplikasi). */
export async function downloadFromDrive(fileId: string) {
  const drive = getDrive();
  const meta = await drive.files.get({
    fileId,
    fields: "name, mimeType, size",
    supportsAllDrives: true,
  });
  const res = await drive.files.get(
    { fileId, alt: "media", supportsAllDrives: true },
    { responseType: "stream" },
  );
  return { meta: meta.data, stream: res.data as unknown as Readable };
}

export async function trashOnDrive(fileId: string) {
  const drive = getDrive();
  await drive.files.update({ fileId, requestBody: { trashed: true }, supportsAllDrives: true });
}

/** Tes koneksi: dipakai halaman Pengaturan. */
export async function testDrive() {
  const drive = getDrive();
  const res = await drive.files.get({
    fileId: ROOT(),
    fields: "id, name, driveId",
    supportsAllDrives: true,
  });
  return res.data;
}

export const MAX_UPLOAD_MB = 4; // batas body request Vercel ±4,5 MB

export function validateUpload(file: File | null) {
  if (!file || file.size === 0) return null;
  if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
    return `Ukuran file maksimal ${MAX_UPLOAD_MB} MB.`;
  }
  const ok = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
  if (file.type && !ok.includes(file.type)) return "Format file harus PDF, JPG, PNG, atau WEBP.";
  return null;
}
