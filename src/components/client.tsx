"use client";

import { signOut } from "next-auth/react";
import { useFormStatus } from "react-dom";
import { useActionState } from "react";

export function SubmitButton({
  children,
  className = "btn-primary",
  confirm,
  name,
  value,
}: {
  children: React.ReactNode;
  className?: string;
  confirm?: string;
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className={className}
      disabled={pending}
      onClick={(e) => {
        if (confirm && !window.confirm(confirm)) {
          e.preventDefault();
          return;
        }
        // Kirim nilai tombol lewat input tersembunyi agar selalu ikut di FormData
        const form = e.currentTarget.form;
        if (name && form) {
          let h = form.querySelector<HTMLInputElement>(`input[data-submitter="${name}"]`);
          if (!h) {
            h = document.createElement("input");
            h.type = "hidden";
            h.name = name;
            h.dataset.submitter = name;
            form.appendChild(h);
          }
          h.value = value ?? "";
        }
      }}
    >
      {pending ? "Memproses..." : children}
    </button>
  );
}

export function LogoutButton() {
  return (
    <button className="text-xs text-brand-100 hover:text-white" onClick={() => signOut({ callbackUrl: "/login" })}>
      Keluar
    </button>
  );
}

export function PrintButton() {
  return (
    <button className="btn-primary no-print" onClick={() => window.print()}>
      Cetak / Simpan PDF
    </button>
  );
}

export type FormState = { error?: string; ok?: string } | undefined;

/** Form dengan server action yang mengembalikan pesan error/sukses. */
export function ActionForm({
  action,
  children,
  className,
}: {
  action: (state: FormState, fd: FormData) => Promise<FormState>;
  children: React.ReactNode;
  className?: string;
}) {
  const [state, formAction] = useActionState(action, undefined);
  return (
    <form action={formAction} className={className}>
      {state?.error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</div>
      )}
      {state?.ok && (
        <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{state.ok}</div>
      )}
      {children}
    </form>
  );
}
