export { default } from "next-auth/middleware";

export const config = {
  // Lindungi semua halaman kecuali login, endpoint auth, dan aset statis
  matcher: ["/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)"],
};
