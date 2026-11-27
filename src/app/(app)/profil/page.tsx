import { requireUser, ROLE_LABEL } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Field, PageHeader } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/client";
import { gantiPassword } from "./actions";

export default async function Page() {
  const u = await requireUser();
  const user = await prisma.user.findUnique({ where: { id: u.id }, include: { unit: true, jabatan: true } });
  return (
    <>
      <PageHeader title="Profil" />
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="card">
          <dl className="grid gap-4 sm:grid-cols-2">
            <Field label="Nama">{user?.nama}</Field>
            <Field label="Username">{user?.username}</Field>
            <Field label="NIP">{user?.nip ?? "-"}</Field>
            <Field label="Role">{ROLE_LABEL[u.role]}</Field>
            <Field label="Jabatan">{user?.jabatan?.nama ?? "-"}</Field>
            <Field label="Unit">{user?.unit?.nama ?? "-"}</Field>
          </dl>
        </div>
        <ActionForm action={gantiPassword} className="card space-y-3">
          <h2 className="font-semibold">Ganti Password</h2>
          <div><label className="lbl">Password lama</label><input type="password" name="lama" className="input" required /></div>
          <div><label className="lbl">Password baru</label><input type="password" name="baru" className="input" required minLength={8} /></div>
          <div><label className="lbl">Ulangi password baru</label><input type="password" name="ulang" className="input" required /></div>
          <SubmitButton>Simpan</SubmitButton>
        </ActionForm>
      </div>
    </>
  );
}
