import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { SuratKeluarForm } from "../form";
import { opsiForm } from "../data";

export default async function Page() {
  const user = await requireUser();
  const opsi = await opsiForm();
  return (
    <>
      <PageHeader title="Buat Surat Keluar" />
      <SuratKeluarForm {...opsi} defaultUnitId={user.unitId} />
    </>
  );
}
