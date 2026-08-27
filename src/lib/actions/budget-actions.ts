"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/guard";
import { budgetSchema, type BudgetInput } from "@/lib/validation/budget";

export type ActionResult = { success: true } | { success: false; error: string };

const DUPLICATE_MESSAGE = "Ya existe un presupuesto para esta combinación";

export async function createBudgetAction(input: BudgetInput): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = budgetSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const data = parsed.data;
  const categoryId = data.scope === "CATEGORY" ? (data.categoryId ?? null) : null;

  if (categoryId) {
    const category = await prisma.category.findFirst({
      where: { id: categoryId, userId: user.id },
      select: { id: true },
    });
    if (!category) {
      return { success: false, error: "Categoría no encontrada" };
    }
  }

  // Postgres no impide duplicados de NULL en el índice único cuando
  // categoryId es null (alcance GLOBAL), así que además del constraint
  // de base de datos hacemos esta comprobación explícita.
  const duplicate = await prisma.budget.findFirst({
    where: { userId: user.id, scope: data.scope, period: data.period, categoryId },
    select: { id: true },
  });
  if (duplicate) {
    return { success: false, error: DUPLICATE_MESSAGE };
  }

  try {
    await prisma.budget.create({
      data: {
        userId: user.id,
        scope: data.scope,
        categoryId,
        period: data.period,
        amount: data.amount,
        currency: data.currency,
        alertThresholdPercent: data.alertThresholdPercent,
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { success: false, error: DUPLICATE_MESSAGE };
    }
    throw err;
  }

  revalidatePath("/presupuestos");
  return { success: true };
}

export async function updateBudgetAction(
  budgetId: string,
  input: BudgetInput
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = budgetSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const data = parsed.data;
  const categoryId = data.scope === "CATEGORY" ? (data.categoryId ?? null) : null;

  const existing = await prisma.budget.findFirst({
    where: { id: budgetId, userId: user.id },
    select: { id: true },
  });
  if (!existing) {
    return { success: false, error: "Presupuesto no encontrado" };
  }

  if (categoryId) {
    const category = await prisma.category.findFirst({
      where: { id: categoryId, userId: user.id },
      select: { id: true },
    });
    if (!category) {
      return { success: false, error: "Categoría no encontrada" };
    }
  }

  const duplicate = await prisma.budget.findFirst({
    where: {
      userId: user.id,
      scope: data.scope,
      period: data.period,
      categoryId,
      NOT: { id: budgetId },
    },
    select: { id: true },
  });
  if (duplicate) {
    return { success: false, error: DUPLICATE_MESSAGE };
  }

  try {
    await prisma.budget.update({
      where: { id: budgetId },
      data: {
        scope: data.scope,
        categoryId,
        period: data.period,
        amount: data.amount,
        currency: data.currency,
        alertThresholdPercent: data.alertThresholdPercent,
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { success: false, error: DUPLICATE_MESSAGE };
    }
    throw err;
  }

  revalidatePath("/presupuestos");
  return { success: true };
}

export async function deleteBudgetAction(budgetId: string): Promise<ActionResult> {
  const user = await requireUser();
  const existing = await prisma.budget.findFirst({
    where: { id: budgetId, userId: user.id },
    select: { id: true },
  });
  if (!existing) {
    return { success: false, error: "Presupuesto no encontrado" };
  }

  await prisma.budget.delete({ where: { id: budgetId } });

  revalidatePath("/presupuestos");
  return { success: true };
}
