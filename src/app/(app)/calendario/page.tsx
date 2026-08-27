import { requireUser } from "@/lib/auth/guard";
import { prisma } from "@/lib/prisma";
import { monthBounds } from "@/lib/domain/spend-aggregation";
import { CalendarView, type CalendarEvent } from "./calendar-view";

interface CalendarioPageProps {
  searchParams: Promise<{ mes?: string }>;
}

const MONTH_PARAM_RE = /^(\d{4})-(\d{2})$/;

function parseMonthParam(mes: string | undefined): { year: number; month: number } {
  const now = new Date();
  if (!mes) return { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 };

  const match = MONTH_PARAM_RE.exec(mes);
  if (!match) return { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 };

  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 };

  return { year, month };
}

function dayKey(date: Date): number {
  return date.getUTCDate();
}

export default async function CalendarioPage({ searchParams }: CalendarioPageProps) {
  const authUser = await requireUser();
  const { mes } = await searchParams;
  const { year, month } = parseMonthParam(mes);

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: authUser.id },
    include: { settings: true },
  });
  const weekStartsOn = (user.settings?.weekStartsOn ?? 1) as 0 | 1 | 2 | 3 | 4 | 5 | 6;

  const reference = new Date(Date.UTC(year, month - 1, 1));
  const { start, end } = monthBounds(reference);

  const [payments, upcomingSubs] = await Promise.all([
    prisma.payment.findMany({
      where: { userId: authUser.id, dueDate: { gte: start, lt: end } },
      include: {
        subscription: { select: { id: true, name: true, category: { select: { name: true } } } },
      },
      orderBy: { dueDate: "asc" },
    }),
    prisma.subscription.findMany({
      where: { userId: authUser.id, deletedAt: null, nextBillingDate: { gte: start, lt: end } },
      include: { category: { select: { name: true } } },
      orderBy: { nextBillingDate: "asc" },
    }),
  ]);

  const paymentDayBySubscription = new Set(
    payments.map((p) => `${p.subscriptionId}:${dayKey(p.dueDate)}`)
  );

  const events: CalendarEvent[] = [
    ...payments.map((p) => ({
      id: p.id,
      subscriptionId: p.subscriptionId,
      subscriptionName: p.subscription.name,
      categoryName: p.subscription.category?.name ?? null,
      amount: p.amount.toString(),
      currency: p.currency,
      day: dayKey(p.dueDate),
      kind: "payment" as const,
      status: p.status,
    })),
    ...upcomingSubs
      .filter((s) => !paymentDayBySubscription.has(`${s.id}:${dayKey(s.nextBillingDate)}`))
      .map((s) => ({
        id: `upcoming-${s.id}`,
        subscriptionId: s.id,
        subscriptionName: s.name,
        categoryName: s.category?.name ?? null,
        amount: s.amount.toString(),
        currency: s.currency,
        day: dayKey(s.nextBillingDate),
        kind: "upcoming" as const,
      })),
  ];

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <div>
        <h1 className="font-heading text-2xl font-medium">Calendario</h1>
        <p className="text-muted-foreground text-sm">
          Cobros previstos y pagos registrados por mes.
        </p>
      </div>

      <CalendarView year={year} month={month} weekStartsOn={weekStartsOn} events={events} />
    </div>
  );
}
