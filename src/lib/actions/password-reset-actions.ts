"use server";

import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { requestPasswordResetSchema, resetPasswordSchema } from "@/lib/validation/auth";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { createPasswordResetToken, consumePasswordResetToken } from "@/lib/domain/password-reset";
import { sendEmail } from "@/lib/email";
import { passwordResetEmail } from "@/lib/email/templates/auth";
import { env } from "@/lib/env";

export interface ActionResult {
  success: boolean;
  error?: string;
}

export interface RequestResetResult extends ActionResult {
  message?: string;
}

// Siempre el mismo mensaje, exista o no el correo — así no se filtra
// qué direcciones están registradas.
const GENERIC_SUCCESS_MESSAGE =
  "Si existe una cuenta con ese correo, te enviamos un enlace para restablecer tu contraseña.";

export async function requestPasswordResetAction(input: unknown): Promise<RequestResetResult> {
  const parsed = requestPasswordResetSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Ingresa un correo válido." };
  }
  const { email } = parsed.data;

  const limited = rateLimit(
    `passwordResetRequest:${email}`,
    RATE_LIMITS.passwordResetRequest.limit,
    RATE_LIMITS.passwordResetRequest.windowMs
  );
  if (!limited.success) {
    // No revelamos que se limitó el intento: mismo mensaje de éxito.
    return { success: true, message: GENERIC_SUCCESS_MESSAGE };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    try {
      const token = await createPasswordResetToken(prisma, user.id);
      const resetUrl = `${env.AUTH_URL ?? ""}/restablecer-contrasena?token=${token}`;
      const { subject, html, text } = passwordResetEmail({ name: user.name, resetUrl });
      await sendEmail({ to: user.email, subject, html, text });
    } catch (err) {
      console.error("[recuperar-contrasena] error generando o enviando el enlace", err);
    }
  }

  return { success: true, message: GENERIC_SUCCESS_MESSAGE };
}

export async function resetPasswordAction(input: unknown): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Revisa los campos del formulario." };
  }
  const { token, password } = parsed.data;

  const limited = rateLimit(
    `passwordResetSubmit:${token}`,
    RATE_LIMITS.passwordResetSubmit.limit,
    RATE_LIMITS.passwordResetSubmit.windowMs
  );
  if (!limited.success) {
    return { success: false, error: "Demasiados intentos. Intenta de nuevo más tarde." };
  }

  const userId = await consumePasswordResetToken(prisma, token);
  if (!userId) {
    return { success: false, error: "El enlace es inválido o venció. Solicita uno nuevo." };
  }

  try {
    const passwordHash = await hashPassword(password);
    await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  } catch (err) {
    console.error("[restablecer-contrasena] error actualizando la contraseña", err);
    return { success: false, error: "No pudimos actualizar tu contraseña. Intenta de nuevo." };
  }

  return { success: true };
}
