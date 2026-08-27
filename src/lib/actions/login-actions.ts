"use server";

import { CredentialsSignin } from "next-auth";
import { signIn } from "@/lib/auth";
import { loginSchema } from "@/lib/validation/auth";

export interface ActionResult {
  success: boolean;
  error?: string;
}

/**
 * Inicia sesión desde el formulario de cliente. El rate limiting del
 * intento ya ocurre dentro de `authorize()` (src/lib/auth/index.ts),
 * así que no se repite aquí para no consumir el mismo cupo dos veces.
 */
export async function loginAction(input: unknown): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Revisa el correo y la contraseña." };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    });
    return { success: true };
  } catch (err) {
    if (err instanceof CredentialsSignin) {
      return { success: false, error: "Correo o contraseña incorrectos." };
    }
    console.error("[iniciar-sesion] error inesperado", err);
    return { success: false, error: "No pudimos iniciar sesión. Intenta de nuevo." };
  }
}
