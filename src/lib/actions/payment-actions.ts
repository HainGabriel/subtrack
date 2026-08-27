"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/guard";
import { prisma } from "@/lib/prisma";
import { recordPayment } from "@/lib/domain/subscriptions";
import { recordAdHocPaymentSchema, updatePaymentSchema } from "@/lib/validation/payment";

export interface ActionResult {
  success: boolean;
  error?: string;
}

function isPrismaErrorWithCode(err: unknown, code: string): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === code
  );
}

function revalidatePaymentPaths() {
  revalidatePath("/pagos");
  revalidatePath("/panel");
  revalidatePath("/calendario");
}

/**
 * Registra un pago ad-hoc para una suscripción elegida por el usuario desde
 * la página de pagos. Reutiliza `recordPayment` del dominio, que es
 * idempotente vía la restricción única `(subscriptionId, dueDate)`.
 */
export async function recordAdHocPaymentAction(input: unknown): Promise<ActionResult> {
  const user = await requireUser();

  const parsed = recordAdHocPaymentSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const data = parsed.data;

  if (data.paymentMethodId) {
    const method = await prisma.paymentMethod.findFirst({
      where: { id: data.paymentMethodId, userId: user.id },
      select: { id: true },
    });
    if (!method) {
      return { success: false, error: "El método de pago elegido no existe." };
    }
  }

  try {
    await recordPayment(prisma, user.id, data.subscriptionId, {
      dueDate: data.dueDate,
      paidDate: data.paidDate,
      amount: data.amount,
      currency: data.currency,
      paymentMethodId: data.paymentMethodId ?? undefined,
      note: data.note ?? undefined,
    });
  } catch (err: unknown) {
    if (isPrismaErrorWithCode(err, "P2002")) {
      return {
        success: false,
        error: "Ya existe un pago registrado para esa fecha de vencimiento.",
      };
    }
    if (isPrismaErrorWithCode(err, "P2025")) {
      return { success: false, error: "La suscripción elegida no existe." };
    }
    console.error("recordAdHocPaymentAction:", err);
    return { success: false, error: "No se pudo registrar el pago." };
  }

  revalidatePaymentPaths();
  return { success: true };
}

/**
 * Corrige un pago ya existente (importe, moneda, método, nota o estado) sin
 * tocar `dueDate`: el ciclo de un pago ya creado nunca cambia. Si el usuario
 * necesita registrar otro ciclo, debe usar `recordAdHocPaymentAction`.
 */
export async function updatePaymentAction(input: unknown): Promise<ActionResult> {
  const user = await requireUser();

  const parsed = updatePaymentSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const { paymentId, amount, currency, paymentMethodId, note, status } = parsed.data;

  const existing = await prisma.payment.findFirst({
    where: { id: paymentId, userId: user.id },
    select: { id: true },
  });
  if (!existing) {
    return { success: false, error: "Pago no encontrado." };
  }

  let paymentMethodLabel: string | null | undefined;
  if (paymentMethodId !== undefined) {
    if (paymentMethodId === null) {
      paymentMethodLabel = null;
    } else {
      const method = await prisma.paymentMethod.findFirst({
        where: { id: paymentMethodId, userId: user.id },
        select: { alias: true },
      });
      if (!method) {
        return { success: false, error: "El método de pago elegido no existe." };
      }
      paymentMethodLabel = method.alias;
    }
  }

  try {
    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        ...(amount !== undefined ? { amount } : {}),
        ...(currency !== undefined ? { currency } : {}),
        ...(note !== undefined ? { note } : {}),
        ...(status !== undefined ? { status } : {}),
        ...(paymentMethodId !== undefined ? { paymentMethodId, paymentMethodLabel } : {}),
      },
    });
  } catch (err: unknown) {
    console.error("updatePaymentAction:", err);
    return { success: false, error: "No se pudo actualizar el pago." };
  }

  revalidatePaymentPaths();
  return { success: true };
}
