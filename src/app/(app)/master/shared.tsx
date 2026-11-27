import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/client";
import { hapusMaster } from "./actions";

export function HapusButton({ entitas, id }: { entitas: string; id: string }) {
  return (
    <ActionForm action={hapusMaster} className="inline">
      <input type="hidden" name="entitas" value={entitas} />
      <input type="hidden" name="id" value={id} />
      <SubmitButton className="btn-danger btn-sm" confirm="Hapus data ini?">Hapus</SubmitButton>
    </ActionForm>
  );
}

export function EditLink({ id }: { id: string }) {
  return <Link href={`?edit=${id}`} className="btn-secondary btn-sm">Edit</Link>;
}

export function BatalLink() {
  return <Link href="?" className="btn-secondary">Batal</Link>;
}
