"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/guard";
import { prisma } from "@/lib/prisma";

export interface ActionResult {
  success: boolean;
  error?: string;
}

const idSchema = z.string().min(1, "Notificación inválida.");

function revalidateNotificationPaths() {
  revalidatePath("/notificaciones");
}

/** Marca una notificación del usuario como leída. */
export async function markAsReadAction(notificationId: string): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = idSchema.safeParse(notificationId);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const result = await prisma.notification.updateMany({
    where: { id: parsed.data, userId: user.id },
    data: { isRead: true, readAt: new Date() },
  });
  if (result.count === 0) {
    return { success: false, error: "Notificación no encontrada." };
  }

  revalidateNotificationPaths();
  return { success: true };
}

/** Marca todas las notificaciones no leídas del usuario como leídas. */
export async function markAllAsReadAction(): Promise<ActionResult> {
  const user = await requireUser();

  await prisma.notification.updateMany({
    where: { userId: user.id, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });

  revalidateNotificationPaths();
  return { success: true };
}

const snoozeSchema = z.object({
  notificationId: z.string().min(1, "Notificación inválida."),
  snoozedUntil: z.coerce.date({ error: "Elige una fecha válida." }),
});

/** Pospone una notificación hasta la fecha indicada. */
export async function snoozeNotificationAction(input: {
  notificationId: string;
  snoozedUntil: Date | string;
}): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = snoozeSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  if (parsed.data.snoozedUntil.getTime() <= Date.now()) {
    return { success: false, error: "Elige una fecha futura." };
  }

  const result = await prisma.notification.updateMany({
    where: { id: parsed.data.notificationId, userId: user.id },
    data: { snoozedUntil: parsed.data.snoozedUntil },
  });
  if (result.count === 0) {
    return { success: false, error: "Notificación no encontrada." };
  }

  revalidateNotificationPaths();
  return { success: true };
}

/** Silencia una notificación (deja de mostrarse como pendiente de atención). */
export async function silenceNotificationAction(notificationId: string): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = idSchema.safeParse(notificationId);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const result = await prisma.notification.updateMany({
    where: { id: parsed.data, userId: user.id },
    data: { silenced: true },
  });
  if (result.count === 0) {
    return { success: false, error: "Notificación no encontrada." };
  }

  revalidateNotificationPaths();
  return { success: true };
}
