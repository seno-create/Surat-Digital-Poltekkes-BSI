import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { SuratMasukForm } from "../../form";
import { ubahSuratMasuk } from "../../actions";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  await requireUser(["ADMIN"]);
  const { id } = await params;
  const [data, klasifikasi] = await Promise.all([
    prisma.suratMasuk.findUnique({ where: { id } }),
    prisma.klasifikasi.findMany({ orderBy: { kode: "asc" } }),
  ]);
  if (!data) notFound();
  return (
    <>
      <PageHeader title={`Edit Surat Masuk ${data.nomorAgenda}`} />
      <SuratMasukForm action={ubahSuratMasuk} klasifikasi={klasifikasi} data={data} />
    </>
  );
}
