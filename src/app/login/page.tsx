import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-800 to-brand-600 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-xl">
        <h1 className="text-center text-lg font-bold text-brand-800">Sistem Persuratan Dinas</h1>
        <p className="mb-6 text-center text-sm text-slate-500">
          {process.env.INSTANSI_NAMA || "Politeknik Kesehatan"}
        </p>
        <LoginForm />
      </div>
    </main>
  );
}
