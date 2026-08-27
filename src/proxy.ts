import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth/config";

// Usa la configuración SIN proveedores (no `@/lib/auth`): importar la
// configuración completa arrastraría `argon2` (binario nativo, usado por
// el proveedor Credentials) al bundle del proxy, que corre en un runtime
// que no soporta addons nativos — ver el comentario en lib/auth/config.ts.
const { auth } = NextAuth(authConfig);

// Next.js 16 renombró `middleware.ts` a `proxy.ts` (ver docs/ARCHITECTURE.md).
// Esta capa solo mejora la UX redirigiendo antes de renderizar; la
// autorización real vuelve a comprobarse en cada Server Action / Route
// Handler mediante requireUser(), como exige la sección 4 del encargo.
const PUBLIC_PATHS = [
  "/",
  "/iniciar-sesion",
  "/registro",
  "/recuperar-contrasena",
  "/restablecer-contrasena",
];

export default auth((req) => {
  const { pathname } = req.nextUrl;

  const isPublic =
    PUBLIC_PATHS.includes(pathname) ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/health") ||
    pathname.startsWith("/api/cron");

  if (!req.auth && !isPublic) {
    const url = new URL("/iniciar-sesion", req.nextUrl.origin);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  if (req.auth && (pathname === "/iniciar-sesion" || pathname === "/registro")) {
    return NextResponse.redirect(new URL("/panel", req.nextUrl.origin));
  }
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
