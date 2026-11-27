import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { SuratMasukForm } from "../form";
import { simpanSuratMasuk } from "../actions";

export default async function Page() {
  await requireUser(["ADMIN"]);
  const klasifikasi = await prisma.klasifikasi.findMany({ orderBy: { kode: "asc" } });
  return (
    <>
      <PageHeader title="Catat Surat Masuk" />
      <SuratMasukForm action={simpanSuratMasuk} klasifikasi={klasifikasi} />
    </>
  );
}
