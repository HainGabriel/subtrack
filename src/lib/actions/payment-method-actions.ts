"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/guard";
import {
  paymentMethodSchema,
  deletePaymentMethodSchema,
  type PaymentMethodInput,
} from "@/lib/validation/payment-method";

export type ActionResult = { success: true } | { success: false; error: string };

function normalizeForType(data: PaymentMethodInput) {
  if (data.type !== "CARD") {
    return { ...data, last4: undefined, expMonth: null, expYear: null };
  }
  return data;
}

export async function createPaymentMethodAction(input: PaymentMethodInput): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = paymentMethodSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const data = normalizeForType(parsed.data);

  await prisma.paymentMethod.create({
    data: {
      userId: user.id,
      type: data.type,
      alias: data.alias,
      brand: data.brand || null,
      last4: data.last4 || null,
      expMonth: data.expMonth ?? null,
      expYear: data.expYear ?? null,
      color: data.color,
      icon: data.icon,
    },
  });

  revalidatePath("/metodos-pago");
  return { success: true };
}

export async function updatePaymentMethodAction(
  paymentMethodId: string,
  input: PaymentMethodInput
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = paymentMethodSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const data = normalizeForType(parsed.data);

  const existing = await prisma.paymentMethod.findFirst({
    where: { id: paymentMethodId, userId: user.id },
    select: { id: true },
  });
  if (!existing) {
    return { success: false, error: "Método de pago no encontrado" };
  }

  await prisma.paymentMethod.update({
    where: { id: paymentMethodId },
    data: {
      type: data.type,
      alias: data.alias,
      brand: data.brand || null,
      last4: data.last4 || null,
      expMonth: data.expMonth ?? null,
      expYear: data.expYear ?? null,
      color: data.color,
      icon: data.icon,
    },
  });

  revalidatePath("/metodos-pago");
  return { success: true };
}

export async function deletePaymentMethodAction(paymentMethodId: string): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = deletePaymentMethodSchema.safeParse({ paymentMethodId });
  if (!parsed.success) {
    return { success: false, error: "Datos inválidos" };
  }

  const existing = await prisma.paymentMethod.findFirst({
    where: { id: paymentMethodId, userId: user.id },
    select: { id: true },
  });
  if (!existing) {
    return { success: false, error: "Método de pago no encontrado" };
  }

  await prisma.paymentMethod.delete({ where: { id: paymentMethodId } });

  revalidatePath("/metodos-pago");
  return { success: true };
}

export async function archivePaymentMethodAction(paymentMethodId: string): Promise<ActionResult> {
  const user = await requireUser();
  const existing = await prisma.paymentMethod.findFirst({
    where: { id: paymentMethodId, userId: user.id },
    select: { id: true },
  });
  if (!existing) {
    return { success: false, error: "Método de pago no encontrado" };
  }

  await prisma.paymentMethod.update({
    where: { id: paymentMethodId },
    data: { archivedAt: new Date() },
  });

  revalidatePath("/metodos-pago");
  return { success: true };
}

export async function unarchivePaymentMethodAction(paymentMethodId: string): Promise<ActionResult> {
  const user = await requireUser();
  const existing = await prisma.paymentMethod.findFirst({
    where: { id: paymentMethodId, userId: user.id },
    select: { id: true },
  });
  if (!existing) {
    return { success: false, error: "Método de pago no encontrado" };
  }

  await prisma.paymentMethod.update({
    where: { id: paymentMethodId },
    data: { archivedAt: null },
  });

  revalidatePath("/metodos-pago");
  return { success: true };
}
