"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/guard";
import { exchangeRateSchema, type ExchangeRateInput } from "@/lib/validation/exchange-rate";

export type ActionResult = { success: true } | { success: false; error: string };

export async function createExchangeRateAction(input: ExchangeRateInput): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = exchangeRateSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const asOfDate = new Date(parsed.data.asOfDate);
  if (Number.isNaN(asOfDate.getTime())) {
    return { success: false, error: "Fecha inválida" };
  }

  await prisma.exchangeRate.create({
    data: {
      userId: user.id,
      baseCurrency: parsed.data.baseCurrency,
      quoteCurrency: parsed.data.quoteCurrency,
      rate: parsed.data.rate,
      asOfDate,
      source: "MANUAL",
    },
  });

  revalidatePath("/perfil");
  return { success: true };
}

export async function deleteExchangeRateAction(exchangeRateId: string): Promise<ActionResult> {
  const user = await requireUser();
  const existing = await prisma.exchangeRate.findFirst({
    where: { id: exchangeRateId, userId: user.id },
    select: { id: true },
  });
  if (!existing) {
    return { success: false, error: "Tasa de cambio no encontrada" };
  }

  await prisma.exchangeRate.delete({ where: { id: exchangeRateId } });

  revalidatePath("/perfil");
  return { success: true };
}
