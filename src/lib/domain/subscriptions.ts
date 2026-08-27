import "server-only";
import type { PrismaClient } from "@/generated/prisma/client";
import type { ActivityAction } from "@/generated/prisma/enums";
import {
  computeNextBillingDate,
  deriveInitialAnchorDay,
  type RecurrenceInput,
} from "@/lib/domain/recurrence";

const DEFAULT_REMINDER_OFFSETS = [30, 7, 3, 1, 0];

export interface CreateSubscriptionInput {
  name: string;
  provider?: string | null;
  description?: string | null;
  notes?: string | null;
  categoryId?: string | null;
  color: string;
  icon: string;
  iconUrl?: string | null;
  amount: string;
  currency: string;
  taxIncluded: boolean;
  taxAmount?: string | null;
  billingFrequency: RecurrenceInput["billingFrequency"];
  customIntervalCount?: number | null;
  customIntervalUnit?: RecurrenceInput["customIntervalUnit"];
  startDate: Date;
  subscriptionType: "RECURRING" | "FREE_TRIAL" | "CONTRACT" | "INSTALLMENT" | "RECURRING_PURCHASE";
  autoRenew: boolean;
  cancelByDate?: Date | null;
  paymentMethodId?: string | null;
  accountProfile?: string | null;
  managementUrl?: string | null;
  supportContact?: string | null;
  seats?: number;
  costPerSeat?: string | null;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  usefulnessRating?: number | null;
  reminderOffsets?: number[];
  tagIds?: string[];
}

/**
 * Crea una suscripción con sus reglas de aviso por defecto. La primera
 * `nextBillingDate` es la propia fecha de inicio: el primer cobro
 * "previsto" se registra ahí, y a partir del primer pago real la fecha
 * avanza según la recurrencia (ver recordPayment).
 */
export async function createSubscription(
  prisma: PrismaClient,
  userId: string,
  input: CreateSubscriptionInput
) {
  const recurrence: RecurrenceInput = {
    billingFrequency: input.billingFrequency,
    customIntervalCount: input.customIntervalCount,
    customIntervalUnit: input.customIntervalUnit,
  };
  const billingAnchorDay = deriveInitialAnchorDay(recurrence, input.startDate);
  const reminderOffsets = input.reminderOffsets ?? DEFAULT_REMINDER_OFFSETS;

  return prisma.$transaction(async (tx) => {
    const subscription = await tx.subscription.create({
      data: {
        userId,
        name: input.name,
        provider: input.provider,
        description: input.description,
        notes: input.notes,
        categoryId: input.categoryId,
        color: input.color,
        icon: input.icon,
        iconUrl: input.iconUrl,
        amount: input.amount,
        currency: input.currency,
        taxIncluded: input.taxIncluded,
        taxAmount: input.taxAmount,
        billingFrequency: input.billingFrequency,
        customIntervalCount: input.customIntervalCount,
        customIntervalUnit: input.customIntervalUnit,
        billingAnchorDay,
        startDate: input.startDate,
        nextBillingDate: input.startDate,
        subscriptionType: input.subscriptionType,
        status: input.subscriptionType === "FREE_TRIAL" ? "TRIAL" : "ACTIVE",
        autoRenew: input.autoRenew,
        cancelByDate: input.cancelByDate,
        paymentMethodId: input.paymentMethodId,
        accountProfile: input.accountProfile,
        managementUrl: input.managementUrl,
        supportContact: input.supportContact,
        seats: input.seats ?? 1,
        costPerSeat: input.costPerSeat,
        priority: input.priority ?? "MEDIUM",
        usefulnessRating: input.usefulnessRating,
        tags: input.tagIds ? { create: input.tagIds.map((tagId) => ({ tagId })) } : undefined,
        reminderRules: {
          create: reminderOffsets.map((offsetDays) => ({ offsetDays })),
        },
      },
    });

    await tx.activityLog.create({
      data: {
        userId,
        subscriptionId: subscription.id,
        action: "CREATED",
        metadata: { name: subscription.name },
      },
    });

    return subscription;
  });
}

export interface RecordPaymentInput {
  dueDate: Date;
  paidDate: Date;
  amount?: string;
  currency?: string;
  paymentMethodId?: string | null;
  note?: string | null;
}

/**
 * Registra un pago para el ciclo `dueDate` de una suscripción y avanza
 * `nextBillingDate` de forma idempotente: la restricción única
 * `(subscriptionId, dueDate)` en `Payment` impide crear dos pagos para
 * el mismo ciclo aunque la acción se dispare dos veces (doble clic,
 * reintento de red, etc.) — el segundo intento falla con un error de
 * restricción única que el llamador puede traducir a "ese ciclo ya
 * tiene un pago registrado" en vez de duplicar cobros.
 */
export async function recordPayment(
  prisma: PrismaClient,
  userId: string,
  subscriptionId: string,
  input: RecordPaymentInput
) {
  return prisma.$transaction(async (tx) => {
    const subscription = await tx.subscription.findFirstOrThrow({
      where: { id: subscriptionId, userId },
      include: { paymentMethod: true },
    });

    const paymentMethodId = input.paymentMethodId ?? subscription.paymentMethodId;
    const paymentMethod = paymentMethodId
      ? await tx.paymentMethod.findUnique({ where: { id: paymentMethodId } })
      : null;

    const payment = await tx.payment.create({
      data: {
        subscriptionId,
        userId,
        dueDate: input.dueDate,
        paidDate: input.paidDate,
        amount: input.amount ?? subscription.amount,
        currency: input.currency ?? subscription.currency,
        status: "PAID",
        paymentMethodId: paymentMethod?.id,
        paymentMethodLabel: paymentMethod?.alias,
        note: input.note,
      },
    });

    const nextBillingDate = computeNextBillingDate(
      {
        billingFrequency: subscription.billingFrequency,
        customIntervalCount: subscription.customIntervalCount,
        customIntervalUnit: subscription.customIntervalUnit,
        billingAnchorDay: subscription.billingAnchorDay,
      },
      input.dueDate
    );

    const updated = await tx.subscription.update({
      where: { id: subscriptionId },
      data: {
        lastPaymentDate: input.paidDate,
        nextBillingDate,
        status: subscription.status === "TRIAL" ? "ACTIVE" : subscription.status,
      },
    });

    await tx.activityLog.create({
      data: {
        userId,
        subscriptionId,
        action: "PAYMENT_RECORDED",
        metadata: { paymentId: payment.id, amount: payment.amount.toString() },
      },
    });

    return { payment, subscription: updated };
  });
}

type StatusTransition = "PAUSED" | "PENDING_CANCELLATION" | "CANCELLED" | "ACTIVE" | "ARCHIVED";

const ACTION_BY_TRANSITION: Record<StatusTransition, ActivityAction> = {
  PAUSED: "PAUSED",
  PENDING_CANCELLATION: "CANCELLATION_SCHEDULED",
  CANCELLED: "CANCELLED",
  ACTIVE: "REACTIVATED",
  ARCHIVED: "ARCHIVED",
};

export async function transitionSubscriptionStatus(
  prisma: PrismaClient,
  userId: string,
  subscriptionId: string,
  status: StatusTransition,
  extra?: { cancelByDate?: Date | null; endDate?: Date | null }
) {
  return prisma.$transaction(async (tx) => {
    await tx.subscription.findFirstOrThrow({ where: { id: subscriptionId, userId } });

    const updated = await tx.subscription.update({
      where: { id: subscriptionId },
      data: {
        status,
        cancelByDate: extra?.cancelByDate,
        endDate: extra?.endDate,
        archivedAt: status === "ARCHIVED" ? new Date() : undefined,
      },
    });

    await tx.activityLog.create({
      data: {
        userId,
        subscriptionId,
        action: ACTION_BY_TRANSITION[status],
      },
    });

    return updated;
  });
}
