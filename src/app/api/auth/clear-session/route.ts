import { signOut } from "@/lib/auth";

/**
 * Limpia una sesión "huérfana": un JWT válido y bien firmado, pero cuyo
 * usuario ya no existe en la base de datos (cuenta eliminada, datos de
 * desarrollo reseteados, etc.). `(app)/layout.tsx` redirige aquí en vez
 * de crashear cuando `prisma.user.findUnique` no encuentra al usuario —
 * las Server Components en un GET no pueden borrar cookies directamente,
 * pero un Route Handler sí, así que `signOut` (que sí las borra) solo
 * puede invocarse desde aquí.
 */
export async function GET() {
  await signOut({ redirectTo: "/iniciar-sesion" });
}
