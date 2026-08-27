import "server-only";
import type { PrismaClient } from "@/generated/prisma/client";
import { annualizedOccurrences } from "@/lib/domain/recurrence";
import { groupByCurrency, type Money } from "@/lib/domain/money";

const ACTIVE_STATUSES = ["ACTIVE", "TRIAL", "PENDING_CANCELLATION"] as const;

export function monthBounds(reference = new Date()) {
  const start = new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), 1));
  const end = new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth() + 1, 1));
  return { start, end };
}

export function yearBounds(reference = new Date()) {
  const start = new Date(Date.UTC(reference.getUTCFullYear(), 0, 1));
  const end = new Date(Date.UTC(reference.getUTCFullYear() + 1, 0, 1));
  return { start, end };
}

/**
 * Gasto PREVISTO mensual: normaliza cada suscripción activa/en prueba/
 * con cancelación programada a su equivalente mensual
 * (amount * ocurrenciasAnuales / 12), agrupado por moneda. Esta es la
 * ÚNICA definición de "previsto" en toda la app — el panel y los
 * presupuestos deben usarla tal cual para no mostrar cifras distintas
 * para el mismo concepto.
 */
export async function getForecastedMonthlySpend(
  prisma: PrismaClient,
  userId: string,
  categoryId?: string
): Promise<Record<string, string>> {
  const subs = await prisma.subscription.findMany({
    where: {
      userId,
      status: { in: [...ACTIVE_STATUSES] },
      deletedAt: null,
      ...(categoryId ? { categoryId } : {}),
    },
    select: {
      amount: true,
      currency: true,
      billingFrequency: true,
      customIntervalCount: true,
      customIntervalUnit: true,
    },
  });

  const items: Money[] = subs.map((s) => {
    const occurrencesPerYear = annualizedOccurrences({
      billingFrequency: s.billingFrequency,
      customIntervalCount: s.customIntervalCount,
      customIntervalUnit: s.customIntervalUnit,
    });
    const monthly = (Number(s.amount) * occurrencesPerYear) / 12;
    return { amount: monthly.toFixed(4), currency: s.currency };
  });

  return groupByCurrency(items);
}

/** Costo anual equivalente de las suscripciones activas, agrupado por moneda. */
export async function getAnnualEquivalentSpend(
  prisma: PrismaClient,
  userId: string
): Promise<Record<string, string>> {
  const monthly = await getForecastedMonthlySpend(prisma, userId);
  const annual: Record<string, string> = {};
  for (const [currency, amount] of Object.entries(monthly)) {
    annual[currency] = (Number(amount) * 12).toFixed(4);
  }
  return annual;
}

/** Gasto REAL: pagos con status=PAID cuya fecha de pago cae en [start, end). */
export async function getActualSpend(
  prisma: PrismaClient,
  userId: string,
  range: { start: Date; end: Date },
  categoryId?: string
): Promise<Record<string, string>> {
  const payments = await prisma.payment.findMany({
    where: {
      userId,
      status: "PAID",
      paidDate: { gte: range.start, lt: range.end },
      ...(categoryId ? { subscription: { categoryId } } : {}),
    },
    select: { amount: true, currency: true },
  });
  return groupByCurrency(
    payments.map((p) => ({ amount: p.amount.toString(), currency: p.currency }))
  );
}

/** Ahorro anual estimado por suscripciones canceladas, agrupado por moneda. */
export async function getCancellationSavings(
  prisma: PrismaClient,
  userId: string
): Promise<Record<string, string>> {
  const cancelled = await prisma.subscription.findMany({
    where: { userId, status: "CANCELLED" },
    select: {
      amount: true,
      currency: true,
      billingFrequency: true,
      customIntervalCount: true,
      customIntervalUnit: true,
    },
  });
  const items: Money[] = cancelled.map((s) => {
    const occurrencesPerYear = annualizedOccurrences({
      billingFrequency: s.billingFrequency,
      customIntervalCount: s.customIntervalCount,
      customIntervalUnit: s.customIntervalUnit,
    });
    return { amount: (Number(s.amount) * occurrencesPerYear).toFixed(4), currency: s.currency };
  });
  return groupByCurrency(items);
}

export interface CategorySlice {
  categoryId: string | null;
  categoryName: string;
  color: string;
  totalsByCurrency: Record<string, string>;
}

/** Distribución de gasto REAL por categoría en un rango de fechas. */
export async function getCategoryDistribution(
  prisma: PrismaClient,
  userId: string,
  range: { start: Date; end: Date }
): Promise<CategorySlice[]> {
  const payments = await prisma.payment.findMany({
    where: { userId, status: "PAID", paidDate: { gte: range.start, lt: range.end } },
    select: {
      amount: true,
      currency: true,
      subscription: {
        select: { categoryId: true, category: { select: { name: true, color: true } } },
      },
    },
  });

  const byCategory = new Map<string, { name: string; color: string; items: Money[] }>();
  for (const p of payments) {
    const key = p.subscription.categoryId ?? "sin-categoria";
    const entry = byCategory.get(key) ?? {
      name: p.subscription.category?.name ?? "Sin categoría",
      color: p.subscription.category?.color ?? "#898781",
      items: [],
    };
    entry.items.push({ amount: p.amount.toString(), currency: p.currency });
    byCategory.set(key, entry);
  }

  return Array.from(byCategory.entries()).map(([categoryId, v]) => ({
    categoryId: categoryId === "sin-categoria" ? null : categoryId,
    categoryName: v.name,
    color: v.color,
    totalsByCurrency: groupByCurrency(v.items),
  }));
}

/** Serie mensual de gasto real (últimos `months` meses, incluyendo el actual). */
export async function getMonthlySpendTrend(
  prisma: PrismaClient,
  userId: string,
  months: number
): Promise<Array<{ year: number; month: number; totalsByCurrency: Record<string, string> }>> {
  const now = new Date();
  const results: Array<{ year: number; month: number; totalsByCurrency: Record<string, string> }> =
    [];

  for (let i = months - 1; i >= 0; i--) {
    const ref = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const { start, end } = monthBounds(ref);
    const totalsByCurrency = await getActualSpend(prisma, userId, { start, end });
    results.push({ year: ref.getUTCFullYear(), month: ref.getUTCMonth() + 1, totalsByCurrency });
  }

  return results;
}

/** Próximas renovaciones dentro de `days` días, para suscripciones activas/en prueba. */
export async function getUpcomingRenewals(prisma: PrismaClient, userId: string, days: number) {
  const now = new Date();
  const until = new Date(now);
  until.setUTCDate(until.getUTCDate() + days);

  return prisma.subscription.findMany({
    where: {
      userId,
      status: { in: [...ACTIVE_STATUSES] },
      deletedAt: null,
      nextBillingDate: { gte: now, lte: until },
    },
    orderBy: { nextBillingDate: "asc" },
    include: { category: true, paymentMethod: true },
  });
}

export interface AttentionItem {
  type:
    | "TRIAL_ENDING"
    | "PAYMENT_METHOD_EXPIRING"
    | "PAYMENT_FAILED"
    | "RENEWAL_SOON"
    | "BUDGET_EXCEEDED";
  severity: "warning" | "serious" | "critical";
  label: string;
  href: string;
}

/** Ítems que requieren atención del usuario, para la sección homónima del panel. */
export async function getAttentionItems(
  prisma: PrismaClient,
  userId: string
): Promise<AttentionItem[]> {
  const items: AttentionItem[] = [];
  const now = new Date();
  const in3Days = new Date(now);
  in3Days.setUTCDate(in3Days.getUTCDate() + 3);
  const in30Days = new Date(now);
  in30Days.setUTCDate(in30Days.getUTCDate() + 30);

  const trialsEnding = await prisma.subscription.findMany({
    where: { userId, status: "TRIAL", nextBillingDate: { lte: in3Days } },
    select: { id: true, name: true },
  });
  for (const s of trialsEnding) {
    items.push({
      type: "TRIAL_ENDING",
      severity: "warning",
      label: `La prueba gratuita de ${s.name} termina pronto`,
      href: `/suscripciones/${s.id}`,
    });
  }

  const renewalsSoon = await prisma.subscription.findMany({
    where: { userId, status: "ACTIVE", nextBillingDate: { lte: in3Days } },
    select: { id: true, name: true, nextBillingDate: true },
  });
  for (const s of renewalsSoon) {
    const daysUntil = Math.round(
      (Date.UTC(
        s.nextBillingDate.getUTCFullYear(),
        s.nextBillingDate.getUTCMonth(),
        s.nextBillingDate.getUTCDate()
      ) -
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())) /
        86_400_000
    );
    const when =
      daysUntil <= 0
        ? "hoy"
        : daysUntil === 1
          ? "mañana"
          : `en ${daysUntil} días`;
    items.push({
      type: "RENEWAL_SOON",
      severity: "warning",
      label: `${s.name} se renueva ${when}`,
      href: `/suscripciones/${s.id}`,
    });
  }

  const failedPayments = await prisma.payment.findMany({
    where: { userId, status: "FAILED" },
    select: { id: true, subscriptionId: true, subscription: { select: { name: true } } },
    take: 10,
    orderBy: { dueDate: "desc" },
  });
  for (const p of failedPayments) {
    items.push({
      type: "PAYMENT_FAILED",
      severity: "critical",
      label: `Pago fallido en ${p.subscription.name}`,
      href: `/suscripciones/${p.subscriptionId}`,
    });
  }

  const expiringMethods = await prisma.paymentMethod.findMany({
    where: {
      userId,
      archivedAt: null,
      type: "CARD",
      expMonth: { not: null },
      expYear: { not: null },
    },
    select: { id: true, alias: true, expMonth: true, expYear: true },
  });
  for (const m of expiringMethods) {
    if (!m.expMonth || !m.expYear) continue;
    const expiry = new Date(Date.UTC(m.expYear, m.expMonth, 0));
    if (expiry <= in30Days) {
      items.push({
        type: "PAYMENT_METHOD_EXPIRING",
        severity: "serious",
        label: `${m.alias} vence el ${m.expMonth}/${m.expYear}`,
        href: "/metodos-pago",
      });
    }
  }

  return items;
}
