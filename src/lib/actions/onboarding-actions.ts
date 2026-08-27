"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser, UnauthorizedError } from "@/lib/auth/guard";
import { prisma } from "@/lib/prisma";
import { CURRENCIES, TIMEZONES } from "@/lib/domain/currencies";

const CURRENCY_CODES = new Set(CURRENCIES.map((c) => c.code));
const TIMEZONE_VALUES = new Set<string>(TIMEZONES);

const onboardingSchema = z.object({
  baseCurrency: z.string().refine((v) => CURRENCY_CODES.has(v), "Selecciona una moneda válida"),
  timezone: z.string().refine((v) => TIMEZONE_VALUES.has(v), "Selecciona una zona horaria válida"),
  weekStartsOn: z.union([z.literal(0), z.literal(1)]),
});

export interface ActionResult {
  success: boolean;
  error?: string;
}

export async function completeOnboarding(input: unknown): Promise<ActionResult> {
  let userId: string;
  try {
    const user = await requireUser();
    userId = user.id;
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return { success: false, error: "Tu sesión expiró. Inicia sesión de nuevo." };
    }
    throw err;
  }

  const parsed = onboardingSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Revisa las preferencias seleccionadas." };
  }

  try {
    await prisma.userSettings.update({
      where: { userId },
      data: {
        baseCurrency: parsed.data.baseCurrency,
        timezone: parsed.data.timezone,
        weekStartsOn: parsed.data.weekStartsOn,
        onboardingCompletedAt: new Date(),
      },
    });
  } catch (err) {
    console.error("[onboarding] error guardando preferencias", err);
    return { success: false, error: "No pudimos guardar tus preferencias. Intenta de nuevo." };
  }

  redirect("/panel");
}
