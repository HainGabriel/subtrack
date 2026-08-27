"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { CredentialsSignin } from "next-auth";
import type { PrismaClient } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { signIn } from "@/lib/auth";
import { hashPassword } from "@/lib/auth/password";
import { registerSchema } from "@/lib/validation/auth";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { provisionNewUser } from "@/lib/domain/provision-user";
import { sendEmail } from "@/lib/email";
import { welcomeEmail } from "@/lib/email/templates/auth";
import { env } from "@/lib/env";

export interface ActionResult {
  success: boolean;
  error?: string;
}

export async function registerAction(input: unknown): Promise<ActionResult> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Revisa los campos del formulario." };
  }
  const { name, email, password } = parsed.data;

  const hdrs = await headers();
  const ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim();
  const limited = rateLimit(
    `register:${ip || email}`,
    RATE_LIMITS.register.limit,
    RATE_LIMITS.register.windowMs
  );
  if (!limited.success) {
    return { success: false, error: "Demasiados intentos. Intenta de nuevo más tarde." };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { success: false, error: "Ya existe una cuenta con este correo." };
  }

  const passwordHash = await hashPassword(password);

  try {
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { name, email, passwordHash },
      });
      // provisionNewUser espera un PrismaClient; el cliente de transacción
      // implementa el mismo conjunto de delegados de modelo que usa la
      // función, solo excluye métodos de control ($transaction, etc.) que
      // no se necesitan aquí.
      await provisionNewUser(tx as unknown as PrismaClient, user.id);
    });
  } catch (err) {
    console.error("[registro] error creando la cuenta", err);
    return { success: false, error: "No pudimos crear tu cuenta. Intenta de nuevo." };
  }

  try {
    const { subject, html, text } = welcomeEmail({
      name,
      appUrl: `${env.AUTH_URL ?? ""}/panel`,
    });
    await sendEmail({ to: email, subject, html, text });
  } catch (err) {
    console.error("[registro] error enviando el correo de bienvenida", err);
  }

  try {
    await signIn("credentials", { email, password, redirect: false });
  } catch (err) {
    if (err instanceof CredentialsSignin) {
      return {
        success: false,
        error:
          "Tu cuenta se creó, pero no pudimos iniciar sesión automáticamente. Inicia sesión manualmente.",
      };
    }
    throw err;
  }

  redirect("/onboarding");
}
