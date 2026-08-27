import { requireUser } from "@/lib/auth/guard";
import { prisma } from "@/lib/prisma";
import { PaymentMethodManager, type PaymentMethodRow } from "./payment-method-manager";

function expiryInfo(
  expMonth: number | null,
  expYear: number | null
): { severity: PaymentMethodRow["expirySeverity"]; daysUntilExpiry: number | null } {
  if (!expMonth || !expYear) return { severity: null, daysUntilExpiry: null };

  const now = new Date();
  // Último día del mes de expiración (fin de validez de la tarjeta).
  const expiry = new Date(Date.UTC(expYear, expMonth, 0, 23, 59, 59));
  const days = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (days < 0) return { severity: "critical", daysUntilExpiry: days };
  if (days <= 7) return { severity: "serious", daysUntilExpiry: days };
  if (days <= 30) return { severity: "warning", daysUntilExpiry: days };
  return { severity: null, daysUntilExpiry: days };
}

export default async function MetodosPagoPage() {
  const user = await requireUser();

  const methods = await prisma.paymentMethod.findMany({
    where: { userId: user.id },
    orderBy: [{ archivedAt: "asc" }, { createdAt: "desc" }],
    include: {
      _count: { select: { subscriptions: true } },
    },
  });

  const rows: PaymentMethodRow[] = methods.map((m) => {
    const { severity, daysUntilExpiry } = expiryInfo(m.expMonth, m.expYear);
    return {
      id: m.id,
      type: m.type,
      alias: m.alias,
      brand: m.brand,
      last4: m.last4,
      expMonth: m.expMonth,
      expYear: m.expYear,
      color: m.color,
      icon: m.icon,
      archivedAt: m.archivedAt?.toISOString() ?? null,
      subscriptionCount: m._count.subscriptions,
      expirySeverity: severity,
      daysUntilExpiry,
    };
  });

  return <PaymentMethodManager methods={rows} />;
}
