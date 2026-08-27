import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/guard";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import type { SubscriptionStatus } from "@/generated/prisma/enums";
import { SubscriptionsExplorer } from "@/components/subscriptions/subscriptions-explorer";
import type { SubscriptionListRow } from "@/components/subscriptions/subscription-table";
import { STATUS_CONFIG } from "@/components/subscriptions/status-badge";

export const metadata: Metadata = { title: "Suscripciones — SubTrack" };

const PAGE_SIZE = 20;

const ORDER_BY: Record<string, Prisma.SubscriptionOrderByWithRelationInput> = {
  proximo_asc: { nextBillingDate: "asc" },
  proximo_desc: { nextBillingDate: "desc" },
  monto_desc: { amount: "desc" },
  monto_asc: { amount: "asc" },
  nombre_asc: { name: "asc" },
};

export default async function SuscripcionesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const sp = await searchParams;

  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const categoria = typeof sp.categoria === "string" ? sp.categoria : undefined;
  const estado = typeof sp.estado === "string" ? sp.estado : undefined;
  const moneda = typeof sp.moneda === "string" ? sp.moneda : undefined;
  const metodoPago = typeof sp.metodoPago === "string" ? sp.metodoPago : undefined;
  const vista = sp.vista === "tarjetas" ? "tarjetas" : "tabla";
  const orden = typeof sp.orden === "string" && sp.orden in ORDER_BY ? sp.orden : "proximo_asc";
  const page = Math.max(1, Number(sp.pagina) || 1);

  const isValidStatus = (value: string | undefined): value is SubscriptionStatus =>
    !!value && value in STATUS_CONFIG;

  const where: Prisma.SubscriptionWhereInput = {
    userId: user.id,
    deletedAt: null,
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { provider: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(categoria ? { categoryId: categoria } : {}),
    ...(isValidStatus(estado) ? { status: estado } : {}),
    ...(moneda ? { currency: moneda } : {}),
    ...(metodoPago ? { paymentMethodId: metodoPago } : {}),
  };

  const [hasAnySubscriptions, total, subscriptions, categories, paymentMethods] = await Promise.all(
    [
      prisma.subscription.count({ where: { userId: user.id, deletedAt: null } }).then((c) => c > 0),
      prisma.subscription.count({ where }),
      prisma.subscription.findMany({
        where,
        orderBy: ORDER_BY[orden],
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        include: {
          category: { select: { id: true, name: true, color: true } },
          tags: { include: { tag: { select: { id: true, name: true, color: true } } } },
        },
      }),
      prisma.category.findMany({
        where: { userId: user.id, archivedAt: null },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
      prisma.paymentMethod.findMany({
        where: { userId: user.id, archivedAt: null },
        orderBy: { alias: "asc" },
        select: { id: true, alias: true },
      }),
    ]
  );

  const rows: SubscriptionListRow[] = subscriptions.map((s) => ({
    id: s.id,
    name: s.name,
    provider: s.provider,
    color: s.color,
    icon: s.icon,
    amount: s.amount.toString(),
    currency: s.currency,
    nextBillingDate: s.nextBillingDate.toISOString(),
    status: s.status,
    category: s.category,
    tags: s.tags.map((t) => t.tag),
  }));

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Suscripciones</h1>
        <p className="text-muted-foreground text-sm">
          Administra todas tus suscripciones activas, en prueba y archivadas.
        </p>
      </div>
      <SubscriptionsExplorer
        rows={rows}
        view={vista}
        categories={categories}
        paymentMethods={paymentMethods}
        page={page}
        pageCount={pageCount}
        total={total}
        hasAnySubscriptions={hasAnySubscriptions}
      />
    </div>
  );
}
