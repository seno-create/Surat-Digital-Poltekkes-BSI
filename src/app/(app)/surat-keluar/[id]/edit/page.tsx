import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { SuratKeluarForm } from "../../form";
import { opsiForm } from "../../data";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const s = await prisma.suratKeluar.findUnique({ where: { id } });
  if (!s) notFound();
  if ((s.createdById !== user.id && user.role !== "ADMIN") || !["DRAFT", "REVISI"].includes(s.status)) redirect(`/surat-keluar/${id}`);
  const opsi = await opsiForm();
  return (
    <>
      <PageHeader title="Edit Surat Keluar" />
      {s.status === "REVISI" && s.catatanVerifikasi && (
        <div className="mb-4 max-w-4xl rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-800">
          Catatan revisi: {s.catatanVerifikasi}
        </div>
      )}
      <SuratKeluarForm {...opsi} data={s} />
    </>
  );
}
