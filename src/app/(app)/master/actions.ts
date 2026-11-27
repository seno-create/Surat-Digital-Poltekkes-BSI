"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import type { Role } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { str, strOrNull } from "@/lib/format";
import type { FormState } from "@/components/client";

function pesanUnik(e: unknown) {
  const code = (e as { code?: string })?.code;
  if (code === "P2002") return "Data dengan kode/nama tersebut sudah ada.";
  if (code === "P2003") return "Data masih dipakai oleh data lain sehingga tidak dapat dihapus.";
  console.error(e);
  return "Terjadi kesalahan saat menyimpan.";
}

type Entitas = "unit" | "jabatan" | "klasifikasi" | "template";

export async function simpanMaster(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser(["ADMIN"]);
  const entitas = str(fd.get("entitas")) as Entitas;
  const id = strOrNull(fd.get("id"));
  try {
    let rec: { id: string };
    if (entitas === "unit") {
      const data = { kode: str(fd.get("kode")).toUpperCase(), nama: str(fd.get("nama")), aktif: fd.get("aktif") === "on" };
      if (!data.kode || !data.nama) return { error: "Kode dan nama wajib diisi." };
      rec = id ? await prisma.unit.update({ where: { id }, data }) : await prisma.unit.create({ data });
    } else if (entitas === "jabatan") {
      const data = { nama: str(fd.get("nama")), level: Number(fd.get("level")) || 3 };
      if (!data.nama) return { error: "Nama wajib diisi." };
      rec = id ? await prisma.jabatan.update({ where: { id }, data }) : await prisma.jabatan.create({ data });
    } else if (entitas === "klasifikasi") {
      const data = { kode: str(fd.get("kode")), nama: str(fd.get("nama")), keterangan: strOrNull(fd.get("keterangan")) };
      if (!data.kode || !data.nama) return { error: "Kode dan nama wajib diisi." };
      rec = id ? await prisma.klasifikasi.update({ where: { id }, data }) : await prisma.klasifikasi.create({ data });
    } else if (entitas === "template") {
      const data = { nama: str(fd.get("nama")), jenis: str(fd.get("jenis")) || "Surat Dinas", isi: str(fd.get("isi")), aktif: fd.get("aktif") === "on" };
      if (!data.nama || !data.isi) return { error: "Nama dan isi template wajib diisi." };
      rec = id ? await prisma.templateSurat.update({ where: { id }, data }) : await prisma.templateSurat.create({ data });
    } else return { error: "Entitas tidak dikenal." };
    await audit(user.id, id ? "UPDATE" : "CREATE", entitas, rec.id);
  } catch (e) {
    return { error: pesanUnik(e) };
  }
  revalidatePath(`/master/${entitas}`);
  redirect(`/master/${entitas}`);
}

export async function hapusMaster(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser(["ADMIN"]);
  const entitas = str(fd.get("entitas")) as Entitas;
  const id = str(fd.get("id"));
  try {
    if (entitas === "unit") await prisma.unit.delete({ where: { id } });
    else if (entitas === "jabatan") await prisma.jabatan.delete({ where: { id } });
    else if (entitas === "klasifikasi") await prisma.klasifikasi.delete({ where: { id } });
    else if (entitas === "template") await prisma.templateSurat.delete({ where: { id } });
    await audit(user.id, "DELETE", entitas, id);
  } catch (e) {
    return { error: pesanUnik(e) };
  }
  revalidatePath(`/master/${entitas}`);
  return { ok: "Data dihapus." };
}

const ROLES: Role[] = ["ADMIN", "PIMPINAN", "KEPALA_UNIT", "STAF"];

export async function simpanPengguna(_: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireUser(["ADMIN"]);
  const id = strOrNull(fd.get("id"));
  const role = str(fd.get("role")) as Role;
  const password = str(fd.get("password"));
  const data = {
    username: str(fd.get("username")).toLowerCase(),
    nama: str(fd.get("nama")),
    nip: strOrNull(fd.get("nip")),
    email: strOrNull(fd.get("email")),
    role: ROLES.includes(role) ? role : "STAF",
    unitId: strOrNull(fd.get("unitId")),
    jabatanId: strOrNull(fd.get("jabatanId")),
    aktif: fd.get("aktif") === "on",
  };
  if (!data.username || !data.nama) return { error: "Username dan nama wajib diisi." };
  if (!/^[a-z0-9._-]{3,}$/.test(data.username)) return { error: "Username minimal 3 karakter (huruf kecil, angka, titik, strip)." };
  if (!id && password.length < 8) return { error: "Password minimal 8 karakter." };
  if (id && password && password.length < 8) return { error: "Password minimal 8 karakter." };
  if (id === admin.id && (!data.aktif || data.role !== "ADMIN")) return { error: "Anda tidak dapat menonaktifkan / menurunkan role akun sendiri." };
  try {
    const passwordHash = password ? await bcrypt.hash(password, 10) : undefined;
    const rec = id
      ? await prisma.user.update({ where: { id }, data: { ...data, ...(passwordHash ? { passwordHash } : {}) } })
      : await prisma.user.create({ data: { ...data, passwordHash: passwordHash! } });
    await audit(admin.id, id ? "UPDATE" : "CREATE", "User", rec.id, { username: rec.username, role: rec.role, aktif: rec.aktif, gantiPassword: !!password });
  } catch (e) {
    return { error: pesanUnik(e) };
  }
  revalidatePath("/master/pengguna");
  redirect("/master/pengguna");
}
