import "server-only";
import { auth } from "@/lib/auth";

export class UnauthorizedError extends Error {
  constructor() {
    super("No autenticado");
    this.name = "UnauthorizedError";
  }
}

/**
 * Comprueba la sesión en el servidor. Debe llamarse al inicio de TODA
 * Server Action y Route Handler que toque datos privados — el proxy
 * (proxy.ts) es solo una conveniencia de UX, no la barrera de seguridad.
 */
export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new UnauthorizedError();
  }
  return session.user;
}
