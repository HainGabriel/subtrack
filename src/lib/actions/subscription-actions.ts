"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/guard";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import {
  createSubscription,
  recordPayment,
  transitionSubscriptionStatus,
} from "@/lib/domain/subscriptions";
import {
  createSubscriptionSchema,
  updateSubscriptionSchema,
  recordPaymentActionSchema,
  markPaymentNonPaidSchema,
  reminderRuleSchema,
  scheduleCancellationSchema,
  createTagSchema,
  bulkArchiveSchema,
  type CreateSubscriptionFormInput,
  type UpdateSubscriptionFormInput,
  type RecordPaymentActionInput,
  type MarkPaymentNonPaidInput,
} from "@/lib/validation/subscription";

export type ActionResult =
  | { success: true; id?: string; tag?: { id: string; name: string; color: string } }
  | { success: false; error: string };

const LIST_PATH = "/suscripciones";
const detailPath = (id: string) => `/suscripciones/${id}`;

function isUniqueConstraintError(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

function firstIssueMessage(error: { issues: { message: string }[] }): string {
  return error.issues[0]?.message ?? "Datos inválidos.";
}

// ────────────────────────────────────────────────────────────────
// Crear / editar
// ────────────────────────────────────────────────────────────────

export async function createSubscriptionAction(
  input: CreateSubscriptionFormInput
): Promise<ActionResult> {
  const user = await requireUser();

  const parsed = createSubscriptionSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error) };
  }
  const data = parsed.data;

  try {
    const subscription = await createSubscription(prisma, user.id, {
      name: data.name,
      provider: data.provider ?? null,
      description: data.description ?? null,
      notes: data.notes ?? null,
      categoryId: data.categoryId ?? null,
      color: data.color,
      icon: data.icon,
      iconUrl: data.iconUrl ?? null,
      amount: data.amount,
      currency: data.currency,
      taxIncluded: data.taxIncluded,
      taxAmount: data.taxAmount ?? null,
      billingFrequency: data.billingFrequency,
      customIntervalCount: data.customIntervalCount ?? null,
      customIntervalUnit: data.customIntervalUnit ?? null,
      startDate: data.startDate,
      subscriptionType: data.subscriptionType,
      autoRenew: data.autoRenew,
      cancelByDate: data.cancelByDate ?? null,
      paymentMethodId: data.paymentMethodId ?? null,
      accountProfile: data.accountProfile ?? null,
      managementUrl: data.managementUrl ?? null,
      supportContact: data.supportContact ?? null,
      seats: data.seats,
      costPerSeat: data.costPerSeat ?? null,
      priority: data.priority,
      usefulnessRating: data.usefulnessRating ?? null,
      tagIds: data.tagIds,
    });

    revalidatePath(LIST_PATH);
    return { success: true, id: subscription.id };
  } catch (error) {
    console.error("createSubscriptionAction", error);
    return { success: false, error: "No se pudo crear la suscripción." };
  }
}

/**
 * La edición permite cambiar todo excepto `billingFrequency`,
 * `customIntervalCount`, `customIntervalUnit`, `startDate` y
 * `nextBillingDate` — esos campos llegan en `input` (de solo lectura en el
 * formulario, para la previsualización) pero se ignoran deliberadamente al
 * construir el `data` de la actualización.
 */
export async function updateSubscriptionAction(
  subscriptionId: string,
  input: UpdateSubscriptionFormInput
): Promise<ActionResult> {
  const user = await requireUser();

  const parsed = updateSubscriptionSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error) };
  }
  const data = parsed.data;

  try {
    await prisma.subscription.findFirstOrThrow({
      where: { id: subscriptionId, userId: user.id },
    });

    // Solo se adjuntan etiquetas que realmente pertenecen al usuario, para
    // no confiar en ids de Tag recibidos del cliente sin validar.
    const ownedTags = data.tagIds.length
      ? await prisma.tag.findMany({
          where: { id: { in: data.tagIds }, userId: user.id },
          select: { id: true },
        })
      : [];
    const ownedTagIds = ownedTags.map((tag) => tag.id);

    await prisma.$transaction(async (tx) => {
      await tx.subscription.update({
        where: { id: subscriptionId },
        data: {
          name: data.name,
          provider: data.provider ?? null,
          description: data.description ?? null,
          notes: data.notes ?? null,
          categoryId: data.categoryId ?? null,
          color: data.color,
          icon: data.icon,
          iconUrl: data.iconUrl ?? null,
          amount: data.amount,
          currency: data.currency,
          taxIncluded: data.taxIncluded,
          taxAmount: data.taxAmount ?? null,
          subscriptionType: data.subscriptionType,
          autoRenew: data.autoRenew,
          cancelByDate: data.cancelByDate ?? null,
          paymentMethodId: data.paymentMethodId ?? null,
          accountProfile: data.accountProfile ?? null,
          managementUrl: data.managementUrl ?? null,
          supportContact: data.supportContact ?? null,
          seats: data.seats,
          costPerSeat: data.costPerSeat ?? null,
          priority: data.priority,
          usefulnessRating: data.usefulnessRating ?? null,
        },
      });

      await tx.subscriptionTag.deleteMany({
        where: { subscriptionId, tagId: { notIn: ownedTagIds } },
      });
      if (ownedTagIds.length) {
        await tx.subscriptionTag.createMany({
          data: ownedTagIds.map((tagId) => ({ subscriptionId, tagId })),
          skipDuplicates: true,
        });
      }

      await tx.activityLog.create({
        data: {
          userId: user.id,
          subscriptionId,
          action: "UPDATED",
          metadata: { name: data.name },
        },
      });
    });

    revalidatePath(LIST_PATH);
    revalidatePath(detailPath(subscriptionId));
    return { success: true };
  } catch (error) {
    console.error("updateSubscriptionAction", error);
    return { success: false, error: "No se pudo actualizar la suscripción." };
  }
}

// ────────────────────────────────────────────────────────────────
// Pagos
// ────────────────────────────────────────────────────────────────

export async function recordPaymentAction(
  subscriptionId: string,
  input: RecordPaymentActionInput
): Promise<ActionResult> {
  const user = await requireUser();

  const parsed = recordPaymentActionSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error) };
  }
  const data = parsed.data;

  try {
    const subscription = await prisma.subscription.findFirstOrThrow({
      where: { id: subscriptionId, userId: user.id },
    });

    const dueDate = data.dueDate ?? subscription.nextBillingDate;
    const paidDate = data.paidDate ?? new Date();

    await recordPayment(prisma, user.id, subscriptionId, {
      dueDate,
      paidDate,
      amount: data.amount,
      currency: data.currency,
      paymentMethodId: data.paymentMethodId ?? undefined,
      note: data.note ?? undefined,
    });

    revalidatePath(LIST_PATH);
    revalidatePath(detailPath(subscriptionId));
    return { success: true };
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return { success: false, error: "Ya existe un pago registrado para ese ciclo." };
    }
    console.error("recordPaymentAction", error);
    return { success: false, error: "No se pudo registrar el pago." };
  }
}

/**
 * Registra un pago con estado SKIPPED/FAILED/REFUNDED directamente (sin
 * pasar por `recordPayment`, porque esos estados NO deben avanzar
 * `nextBillingDate`). Respeta la misma restricción única
 * `(subscriptionId, dueDate)` para idempotencia.
 */
export async function markPaymentNonPaidAction(
  subscriptionId: string,
  input: MarkPaymentNonPaidInput
): Promise<ActionResult> {
  const user = await requireUser();

  const parsed = markPaymentNonPaidSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error) };
  }
  const data = parsed.data;

  try {
    const subscription = await prisma.subscription.findFirstOrThrow({
      where: { id: subscriptionId, userId: user.id },
    });

    const paymentMethodId = data.paymentMethodId ?? subscription.paymentMethodId ?? undefined;
    const paymentMethod = paymentMethodId
      ? await prisma.paymentMethod.findFirst({ where: { id: paymentMethodId, userId: user.id } })
      : null;

    await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          subscriptionId,
          userId: user.id,
          dueDate: data.dueDate,
          paidDate: data.paidDate ?? null,
          amount: data.amount ?? subscription.amount,
          currency: data.currency ?? subscription.currency,
          status: data.status,
          paymentMethodId: paymentMethod?.id,
          paymentMethodLabel: paymentMethod?.alias,
          note: data.note,
        },
      });

      await tx.activityLog.create({
        data: {
          userId: user.id,
          subscriptionId,
          action: "PAYMENT_RECORDED",
          metadata: { paymentId: payment.id, status: data.status },
        },
      });
    });

    revalidatePath(LIST_PATH);
    revalidatePath(detailPath(subscriptionId));
    return { success: true };
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return { success: false, error: "Ya existe un pago registrado para ese ciclo." };
    }
    console.error("markPaymentNonPaidAction", error);
    return { success: false, error: "No se pudo registrar el pago." };
  }
}

// ────────────────────────────────────────────────────────────────
// Transiciones de estado
// ────────────────────────────────────────────────────────────────

export async function pauseAction(subscriptionId: string): Promise<ActionResult> {
  const user = await requireUser();
  try {
    await transitionSubscriptionStatus(prisma, user.id, subscriptionId, "PAUSED");
    revalidatePath(LIST_PATH);
    revalidatePath(detailPath(subscriptionId));
    return { success: true };
  } catch (error) {
    console.error("pauseAction", error);
    return { success: false, error: "No se pudo pausar la suscripción." };
  }
}

export async function scheduleCancellationAction(
  subscriptionId: string,
  input: { cancelByDate?: Date | null }
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = scheduleCancellationSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error) };
  }
  try {
    await transitionSubscriptionStatus(prisma, user.id, subscriptionId, "PENDING_CANCELLATION", {
      cancelByDate: parsed.data.cancelByDate ?? null,
    });
    revalidatePath(LIST_PATH);
    revalidatePath(detailPath(subscriptionId));
    return { success: true };
  } catch (error) {
    console.error("scheduleCancellationAction", error);
    return { success: false, error: "No se pudo programar la cancelación." };
  }
}

export async function cancelNowAction(subscriptionId: string): Promise<ActionResult> {
  const user = await requireUser();
  try {
    await transitionSubscriptionStatus(prisma, user.id, subscriptionId, "CANCELLED", {
      endDate: new Date(),
    });
    revalidatePath(LIST_PATH);
    revalidatePath(detailPath(subscriptionId));
    return { success: true };
  } catch (error) {
    console.error("cancelNowAction", error);
    return { success: false, error: "No se pudo cancelar la suscripción." };
  }
}

export async function reactivateAction(subscriptionId: string): Promise<ActionResult> {
  const user = await requireUser();
  try {
    // Al reactivar se limpian cancelByDate/endDate: si no, quedaría una
    // suscripción activa con una cancelación "pendiente" fantasma.
    await transitionSubscriptionStatus(prisma, user.id, subscriptionId, "ACTIVE", {
      cancelByDate: null,
      endDate: null,
    });
    revalidatePath(LIST_PATH);
    revalidatePath(detailPath(subscriptionId));
    return { success: true };
  } catch (error) {
    console.error("reactivateAction", error);
    return { success: false, error: "No se pudo reactivar la suscripción." };
  }
}

export async function archiveAction(subscriptionId: string): Promise<ActionResult> {
  const user = await requireUser();
  try {
    await transitionSubscriptionStatus(prisma, user.id, subscriptionId, "ARCHIVED");
    revalidatePath(LIST_PATH);
    revalidatePath(detailPath(subscriptionId));
    return { success: true };
  } catch (error) {
    console.error("archiveAction", error);
    return { success: false, error: "No se pudo archivar la suscripción." };
  }
}

export async function bulkArchiveAction(ids: string[]): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = bulkArchiveSchema.safeParse({ ids });
  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error) };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const owned = await tx.subscription.findMany({
        where: { id: { in: parsed.data.ids }, userId: user.id },
        select: { id: true },
      });
      const ownedIds = owned.map((subscription) => subscription.id);
      if (ownedIds.length === 0) return;

      await tx.subscription.updateMany({
        where: { id: { in: ownedIds }, userId: user.id },
        data: { status: "ARCHIVED", archivedAt: new Date() },
      });
      await tx.activityLog.createMany({
        data: ownedIds.map((id) => ({
          userId: user.id,
          subscriptionId: id,
          action: "ARCHIVED" as const,
        })),
      });
    });

    revalidatePath(LIST_PATH);
    return { success: true };
  } catch (error) {
    console.error("bulkArchiveAction", error);
    return { success: false, error: "No se pudieron archivar las suscripciones seleccionadas." };
  }
}

export async function deleteSubscriptionAction(subscriptionId: string): Promise<ActionResult> {
  const user = await requireUser();
  try {
    const subscription = await prisma.subscription.findFirstOrThrow({
      where: { id: subscriptionId, userId: user.id },
      include: { _count: { select: { payments: true } } },
    });

    if (subscription._count.payments > 0) {
      return {
        success: false,
        error:
          "Esta suscripción ya tiene pagos registrados y no se puede eliminar del todo — archívala en su lugar para conservar el historial.",
      };
    }

    await prisma.$transaction(async (tx) => {
      // El log se crea ANTES de borrar: la FK a Subscription se pondrá en
      // null automáticamente al eliminarla (onDelete: SetNull), pero el
      // nombre queda preservado en metadata.
      await tx.activityLog.create({
        data: {
          userId: user.id,
          subscriptionId,
          action: "DELETED",
          metadata: { name: subscription.name },
        },
      });
      await tx.subscription.delete({ where: { id: subscriptionId } });
    });

    revalidatePath(LIST_PATH);
    return { success: true };
  } catch (error) {
    console.error("deleteSubscriptionAction", error);
    return { success: false, error: "No se pudo eliminar la suscripción." };
  }
}

// ────────────────────────────────────────────────────────────────
// Reglas de aviso
// ────────────────────────────────────────────────────────────────

export async function addReminderRuleAction(
  subscriptionId: string,
  offsetDays: number
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = reminderRuleSchema.safeParse({ offsetDays });
  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error) };
  }

  try {
    await prisma.subscription.findFirstOrThrow({
      where: { id: subscriptionId, userId: user.id },
    });
    await prisma.reminderRule.create({
      data: { subscriptionId, offsetDays: parsed.data.offsetDays },
    });
    revalidatePath(detailPath(subscriptionId));
    return { success: true };
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return { success: false, error: "Ya existe un aviso configurado para ese número de días." };
    }
    console.error("addReminderRuleAction", error);
    return { success: false, error: "No se pudo agregar el aviso." };
  }
}

export async function removeReminderRuleAction(
  subscriptionId: string,
  ruleId: string
): Promise<ActionResult> {
  const user = await requireUser();
  try {
    await prisma.subscription.findFirstOrThrow({
      where: { id: subscriptionId, userId: user.id },
    });
    await prisma.reminderRule.deleteMany({ where: { id: ruleId, subscriptionId } });
    revalidatePath(detailPath(subscriptionId));
    return { success: true };
  } catch (error) {
    console.error("removeReminderRuleAction", error);
    return { success: false, error: "No se pudo quitar el aviso." };
  }
}

export async function toggleReminderRuleAction(
  subscriptionId: string,
  ruleId: string,
  enabled: boolean
): Promise<ActionResult> {
  const user = await requireUser();
  try {
    await prisma.subscription.findFirstOrThrow({
      where: { id: subscriptionId, userId: user.id },
    });
    await prisma.reminderRule.updateMany({
      where: { id: ruleId, subscriptionId },
      data: { enabled },
    });
    revalidatePath(detailPath(subscriptionId));
    return { success: true };
  } catch (error) {
    console.error("toggleReminderRuleAction", error);
    return { success: false, error: "No se pudo actualizar el aviso." };
  }
}

// ────────────────────────────────────────────────────────────────
// Etiquetas
// ────────────────────────────────────────────────────────────────

export async function createTagAction(name: string, color?: string): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = createTagSchema.safeParse({ name, color });
  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error) };
  }

  try {
    const tag = await prisma.tag.create({
      data: { userId: user.id, name: parsed.data.name, color: parsed.data.color },
    });
    return { success: true, tag: { id: tag.id, name: tag.name, color: tag.color } };
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      // Ya existe una etiqueta con ese nombre para este usuario: se
      // reutiliza en vez de fallar, para que el selector no se rompa.
      const existing = await prisma.tag.findFirst({
        where: { userId: user.id, name: parsed.data.name },
      });
      if (existing) {
        return {
          success: true,
          tag: { id: existing.id, name: existing.name, color: existing.color },
        };
      }
    }
    console.error("createTagAction", error);
    return { success: false, error: "No se pudo crear la etiqueta." };
  }
}

export async function attachTagAction(
  subscriptionId: string,
  tagId: string
): Promise<ActionResult> {
  const user = await requireUser();
  try {
    await prisma.subscription.findFirstOrThrow({
      where: { id: subscriptionId, userId: user.id },
    });
    await prisma.tag.findFirstOrThrow({ where: { id: tagId, userId: user.id } });

    await prisma.subscriptionTag.upsert({
      where: { subscriptionId_tagId: { subscriptionId, tagId } },
      create: { subscriptionId, tagId },
      update: {},
    });

    revalidatePath(detailPath(subscriptionId));
    return { success: true };
  } catch (error) {
    console.error("attachTagAction", error);
    return { success: false, error: "No se pudo agregar la etiqueta." };
  }
}

export async function detachTagAction(
  subscriptionId: string,
  tagId: string
): Promise<ActionResult> {
  const user = await requireUser();
  try {
    await prisma.subscription.findFirstOrThrow({
      where: { id: subscriptionId, userId: user.id },
    });
    await prisma.subscriptionTag.deleteMany({ where: { subscriptionId, tagId } });
    revalidatePath(detailPath(subscriptionId));
    return { success: true };
  } catch (error) {
    console.error("detachTagAction", error);
    return { success: false, error: "No se pudo quitar la etiqueta." };
  }
}
