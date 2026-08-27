import "server-only";
import type { PrismaClient } from "@/generated/prisma/client";

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDaysIso(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

/** "Qué día es hoy" en la zona horaria del usuario, como YYYY-MM-DD. */
function todayInTimezone(timezone: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  } catch {
    return isoDate(new Date());
  }
}

interface GenerateResult {
  created: number;
  skippedExisting: number;
}

/**
 * Escanea suscripciones activas, reglas de aviso, pruebas por terminar,
 * fechas límite de cancelación, métodos de pago por vencer y
 * presupuestos excedidos; crea una `Notification` por evento.
 *
 * Idempotencia: cada evento posible tiene una `dedupeKey` determinística
 * (tipo + entidad + fecha). Si el job se ejecuta varias veces el mismo
 * día (o se reintenta tras un fallo), el `create` con la clave única
 * falla con P2002 y se cuenta como "ya existía" en vez de duplicar el
 * aviso — así una ejecución repetida del cron nunca genera notificaciones
 * repetidas.
 */
export async function generateDueNotifications(prisma: PrismaClient): Promise<GenerateResult> {
  let created = 0;
  let skippedExisting = 0;

  const tryCreate = async (data: Parameters<PrismaClient["notification"]["create"]>[0]["data"]) => {
    try {
      await prisma.notification.create({ data });
      created += 1;
    } catch (err: unknown) {
      if (isUniqueConstraintError(err)) {
        skippedExisting += 1;
      } else {
        throw err;
      }
    }
  };

  // ── Renovaciones próximas (reglas de aviso por suscripción) ────────
  const activeSubs = await prisma.subscription.findMany({
    where: { status: { in: ["ACTIVE", "TRIAL", "PENDING_CANCELLATION"] }, deletedAt: null },
    include: { reminderRules: { where: { enabled: true } }, user: { include: { settings: true } } },
  });

  for (const sub of activeSubs) {
    const timezone = sub.user.settings?.timezone ?? "America/Santo_Domingo";
    const today = todayInTimezone(timezone);

    for (const rule of sub.reminderRules) {
      const notifyDate = addDaysIso(sub.nextBillingDate, -rule.offsetDays);
      if (isoDate(notifyDate) !== today) continue;

      const type = sub.subscriptionType === "FREE_TRIAL" ? "TRIAL_ENDING" : "RENEWAL_UPCOMING";
      const dedupeKey = `${type}:${sub.id}:${rule.offsetDays}:${isoDate(sub.nextBillingDate)}`;

      await tryCreate({
        userId: sub.userId,
        type,
        subscriptionId: sub.id,
        dedupeKey,
        title:
          rule.offsetDays === 0
            ? `${sub.name} se cobra hoy`
            : rule.offsetDays < 0
              ? `${sub.name} venció hace ${-rule.offsetDays} día(s)`
              : `${sub.name} se cobra en ${rule.offsetDays} día(s)`,
        body: `Próximo cobro de ${sub.name}: ${isoDate(sub.nextBillingDate)}.`,
      });
    }

    // ── Fecha límite de cancelación ──────────────────────────────────
    if (sub.cancelByDate && isoDate(sub.cancelByDate) === today) {
      await tryCreate({
        userId: sub.userId,
        type: "CANCEL_DEADLINE",
        subscriptionId: sub.id,
        dedupeKey: `CANCEL_DEADLINE:${sub.id}:${isoDate(sub.cancelByDate)}`,
        title: `Hoy vence el plazo para cancelar ${sub.name}`,
        body: `Si no cancelas ${sub.name} hoy, se renovará automáticamente.`,
      });
    }
  }

  // ── Métodos de pago próximos a expirar (30 días antes, día 1 del mes) ──
  const methods = await prisma.paymentMethod.findMany({
    where: { archivedAt: null, type: "CARD", expMonth: { not: null }, expYear: { not: null } },
    include: { user: { include: { settings: true } } },
  });
  const now = new Date();
  for (const method of methods) {
    if (!method.expMonth || !method.expYear) continue;
    const expiry = new Date(Date.UTC(method.expYear, method.expMonth, 0)); // último día del mes de expiración
    const daysUntilExpiry = Math.round((expiry.getTime() - now.getTime()) / 86_400_000);
    if (daysUntilExpiry !== 30) continue;

    await tryCreate({
      userId: method.userId,
      type: "PAYMENT_METHOD_EXPIRING",
      dedupeKey: `PAYMENT_METHOD_EXPIRING:${method.id}:${method.expYear}-${method.expMonth}`,
      title: `${method.alias} vence pronto`,
      body: `Tu método de pago "${method.alias}" vence en ${method.expMonth}/${method.expYear}.`,
    });
  }

  // ── Presupuestos excedidos (umbral configurable, revisión mensual) ──
  const budgets = await prisma.budget.findMany({ where: { period: "MONTHLY" } });
  const monthKey = isoDate(now).slice(0, 7);
  for (const budget of budgets) {
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

    const payments = await prisma.payment.findMany({
      where: {
        userId: budget.userId,
        status: "PAID",
        paidDate: { gte: monthStart, lt: monthEnd },
        currency: budget.currency,
        ...(budget.categoryId ? { subscription: { categoryId: budget.categoryId } } : {}),
      },
      select: { amount: true },
    });
    const spent = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const threshold = (Number(budget.amount) * budget.alertThresholdPercent) / 100;
    if (spent < threshold) continue;

    await tryCreate({
      userId: budget.userId,
      type: "BUDGET_THRESHOLD",
      dedupeKey: `BUDGET_THRESHOLD:${budget.id}:${monthKey}`,
      title: "Presupuesto cerca del límite",
      body: `Llevas gastado ${spent.toFixed(2)} ${budget.currency} de un presupuesto de ${budget.amount.toString()} ${budget.currency} este mes.`,
    });
  }

  return { created, skippedExisting };
}

function isUniqueConstraintError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "P2002"
  );
}
