"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/guard";
import {
  categorySchema,
  deleteCategorySchema,
  type CategoryInput,
  type DeleteCategoryInput,
} from "@/lib/validation/category";

export type ActionResult =
  | { success: true }
  | { success: false; error: string; needsReassignment?: boolean; subscriptionCount?: number };

export async function createCategoryAction(input: CategoryInput): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  try {
    await prisma.category.create({
      data: { ...parsed.data, userId: user.id },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { success: false, error: "Ya tienes una categoría con ese nombre" };
    }
    throw err;
  }

  revalidatePath("/categorias");
  return { success: true };
}

export async function updateCategoryAction(
  categoryId: string,
  input: CategoryInput
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const existing = await prisma.category.findFirst({
    where: { id: categoryId, userId: user.id },
    select: { id: true },
  });
  if (!existing) {
    return { success: false, error: "Categoría no encontrada" };
  }

  try {
    await prisma.category.update({
      where: { id: categoryId },
      data: parsed.data,
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { success: false, error: "Ya tienes una categoría con ese nombre" };
    }
    throw err;
  }

  revalidatePath("/categorias");
  return { success: true };
}

export async function deleteCategoryAction(input: DeleteCategoryInput): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = deleteCategorySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const { categoryId, reassignToCategoryId } = parsed.data;

  const category = await prisma.category.findFirst({
    where: { id: categoryId, userId: user.id },
    select: { id: true },
  });
  if (!category) {
    return { success: false, error: "Categoría no encontrada" };
  }

  const subscriptionCount = await prisma.subscription.count({ where: { categoryId } });

  if (subscriptionCount > 0) {
    if (!reassignToCategoryId) {
      return {
        success: false,
        error: "Esta categoría tiene suscripciones asociadas. Elige a cuál reasignarlas.",
        needsReassignment: true,
        subscriptionCount,
      };
    }

    const target = await prisma.category.findFirst({
      where: { id: reassignToCategoryId, userId: user.id },
      select: { id: true },
    });
    if (!target || target.id === categoryId) {
      return { success: false, error: "Elige una categoría de destino válida" };
    }

    await prisma.$transaction([
      prisma.subscription.updateMany({
        where: { categoryId },
        data: { categoryId: reassignToCategoryId },
      }),
      prisma.category.delete({ where: { id: categoryId } }),
    ]);
  } else {
    await prisma.category.delete({ where: { id: categoryId } });
  }

  revalidatePath("/categorias");
  return { success: true };
}

export async function archiveCategoryAction(categoryId: string): Promise<ActionResult> {
  const user = await requireUser();
  const category = await prisma.category.findFirst({
    where: { id: categoryId, userId: user.id },
    select: { id: true },
  });
  if (!category) {
    return { success: false, error: "Categoría no encontrada" };
  }

  await prisma.category.update({
    where: { id: categoryId },
    data: { archivedAt: new Date() },
  });

  revalidatePath("/categorias");
  return { success: true };
}

export async function unarchiveCategoryAction(categoryId: string): Promise<ActionResult> {
  const user = await requireUser();
  const category = await prisma.category.findFirst({
    where: { id: categoryId, userId: user.id },
    select: { id: true },
  });
  if (!category) {
    return { success: false, error: "Categoría no encontrada" };
  }

  await prisma.category.update({
    where: { id: categoryId },
    data: { archivedAt: null },
  });

  revalidatePath("/categorias");
  return { success: true };
}
