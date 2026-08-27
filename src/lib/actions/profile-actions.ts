"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/guard";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { signOut } from "@/lib/auth";
import { changePasswordSchema, type ChangePasswordInput } from "@/lib/validation/auth";
import {
  profileSchema,
  preferencesSchema,
  deleteAccountSchema,
  type ProfileInput,
  type PreferencesInput,
  type DeleteAccountInput,
} from "@/lib/validation/profile";

export type ActionResult = { success: true } | { success: false; error: string };

export async function updateProfileAction(input: ProfileInput): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { name: parsed.data.name, image: parsed.data.image ? parsed.data.image : null },
  });

  revalidatePath("/perfil");
  return { success: true };
}

export async function updatePreferencesAction(input: PreferencesInput): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = preferencesSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  await prisma.userSettings.update({
    where: { userId: user.id },
    data: parsed.data,
  });

  revalidatePath("/perfil");
  return { success: true };
}

export async function changePasswordAction(input: ChangePasswordInput): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const dbUser = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    select: { passwordHash: true },
  });

  const valid = await verifyPassword(dbUser.passwordHash, parsed.data.currentPassword);
  if (!valid) {
    return { success: false, error: "La contraseña actual es incorrecta" };
  }

  const newHash = await hashPassword(parsed.data.newPassword);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: newHash } });

  return { success: true };
}

export async function deleteAccountAction(input: DeleteAccountInput): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = deleteAccountSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const dbUser = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    select: { passwordHash: true, email: true },
  });

  if (parsed.data.emailConfirmation.toLowerCase() !== dbUser.email.toLowerCase()) {
    return { success: false, error: "El correo no coincide con el de tu cuenta" };
  }

  const valid = await verifyPassword(dbUser.passwordHash, parsed.data.password);
  if (!valid) {
    return { success: false, error: "La contraseña es incorrecta" };
  }

  // Las cascadas del esquema (onDelete: Cascade) limpian el resto de los
  // datos del usuario (categorías, suscripciones, pagos, etc.).
  await prisma.user.delete({ where: { id: user.id } });

  await signOut({ redirectTo: "/" });
  return { success: true };
}
