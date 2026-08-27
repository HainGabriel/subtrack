import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  TrendingUp,
  Wallet,
  CalendarRange,
  PiggyBank,
  CalendarClock,
  Plus,
  Receipt,
  Bell,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { requireUser } from "@/lib/auth/guard";
import { prisma } from "@/lib/prisma";
import { convertToBaseCurrency } from "@/lib/domain/exchange-rate";
import { addMoney, formatMoney } from "@/lib/domain/money";
import { annualizedOccurrences } from "@/lib/domain/recurrence";
import {
  monthBounds,
  getForecastedMonthlySpend,
  getAnnualEquivalentSpend,
  getActualSpend,
  getCancellationSavings,
  getCategoryDistribution,
  getMonthlySpendTrend,
  getUpcomingRenewals,
  getAttentionItems,
} from "@/lib/domain/spend-aggregation";
import { StatTile, type MoneySummary } from "@/components/dashboard/stat-tile";
import { SpendTrendChart, type SpendTrendPoint } from "@/components/dashboard/spend-trend-chart";
import {
  CategoryDistributionChart,
  type CategorySliceDatum,
} from "@/components/dashboard/category-distribution-chart";
import { AttentionList } from "@/components/dashboard/attention-list";
import {
  UpcomingRenewalsList,
  type UpcomingRenewalItem,
} from "@/components/dashboard/upcoming-renewals-list";
import {
  TopSubscriptionsList,
  type TopSubscriptionItem,
} from "@/components/dashboard/top-subscriptions-list";

const ACTIVE_STATUSES = ["ACTIVE", "TRIAL", "PENDING_CANCELLATION"] as const;
const TREND_MONTHS = 6;
const TOP_SUBSCRIPTIONS_LIMIT = 8;
const CATEGORY_LIMIT = 7;

/**
 * Consolida un desglose por moneda en la moneda base del usuario. Si falta
 * la tasa de cambio para alguna de las monedas involucradas, no inventa un
 * total: devuelve el desglose original para que la UI lo muestre sin sumar.
 */
async function summarizeInBaseCurrency(
  totals: Record<string, string>,
  userId: string,
  baseCurrency: string
): Promise<MoneySummary> {
  const currencies = Object.keys(totals);
  if (currencies.length === 0) return { kind: "empty" };

  let sum = "0";
  let isEstimate = false;
  for (const currency of currencies) {
    const converted = await convertToBaseCurrency(
      prisma,
      userId,
      totals[currency],
      currency,
      baseCurrency
    );
    if (!converted) {
      return { kind: "breakdown", totals };
    }
    sum = addMoney(sum, converted.amount);
    isEstimate = isEstimate || converted.isEstimate;
  }
  return { kind: "single", amount: sum, currency: baseCurrency, isEstimate };
}

export default async function PanelPage() {
  const authUser = await requireUser();

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: authUser.id },
    include: { settings: true },
  });
  const baseCurrency = user.settings?.baseCurrency ?? "DOP";
  const now = new Date();
  const { start: monthStart, end: monthEnd } = monthBounds(now);

  const [
    forecastedMonthly,
    actualMonthly,
    annualEquivalent,
    cancellationSavings,
    categoryDistribution,
    monthlyTrend,
    upcomingRenewalsRaw,
    attentionItems,
    topSubscriptionsRaw,
  ] = await Promise.all([
    getForecastedMonthlySpend(prisma, authUser.id),
    getActualSpend(prisma, authUser.id, { start: monthStart, end: monthEnd }),
    getAnnualEquivalentSpend(prisma, authUser.id),
    getCancellationSavings(prisma, authUser.id),
    getCategoryDistribution(prisma, authUser.id, { start: monthStart, end: monthEnd }),
    getMonthlySpendTrend(prisma, authUser.id, TREND_MONTHS),
    getUpcomingRenewals(prisma, authUser.id, 14),
    getAttentionItems(prisma, authUser.id),
    prisma.subscription.findMany({
      where: { userId: authUser.id, status: { in: [...ACTIVE_STATUSES] }, deletedAt: null },
      include: { category: true },
    }),
  ]);

  const [forecastSummary, actualSummary, annualSummary, savingsSummary] = await Promise.all([
    summarizeInBaseCurrency(forecastedMonthly, authUser.id, baseCurrency),
    summarizeInBaseCurrency(actualMonthly, authUser.id, baseCurrency),
    summarizeInBaseCurrency(annualEquivalent, authUser.id, baseCurrency),
    summarizeInBaseCurrency(cancellationSavings, authUser.id, baseCurrency),
  ]);

  const upcomingRenewals: UpcomingRenewalItem[] = upcomingRenewalsRaw.map((sub) => ({
    id: sub.id,
    name: sub.name,
    amount: sub.amount.toString(),
    currency: sub.currency,
    nextBillingDate: sub.nextBillingDate,
    categoryName: sub.category?.name ?? null,
    paymentMethodAlias: sub.paymentMethod?.alias ?? null,
  }));
  const nextRenewal = upcomingRenewals[0];

  // ── Gráfica de gasto mensual (últimos N meses) ──────────────────────
  const spendTrend: SpendTrendPoint[] = await Promise.all(
    monthlyTrend.map(async (point) => {
      const summary = await summarizeInBaseCurrency(
        point.totalsByCurrency,
        authUser.id,
        baseCurrency
      );
      const label = format(new Date(Date.UTC(point.year, point.month - 1, 1)), "MMM yyyy", {
        locale: es,
      });
      return {
        key: `${point.year}-${String(point.month).padStart(2, "0")}`,
        label,
        amount: summary.kind === "single" ? Number(summary.amount) : null,
        isEstimate: summary.kind === "single" ? summary.isEstimate : false,
        totalsByCurrency: point.totalsByCurrency,
      };
    })
  );

  // ── Distribución por categoría (top 7 + "Otros") ────────────────────
  const unresolvedCategoryNames: string[] = [];
  const resolvedCategories: CategorySliceDatum[] = [];
  for (const slice of categoryDistribution) {
    const summary = await summarizeInBaseCurrency(
      slice.totalsByCurrency,
      authUser.id,
      baseCurrency
    );
    if (summary.kind === "single") {
      resolvedCategories.push({
        categoryId: slice.categoryId,
        categoryName: slice.categoryName,
        amount: Number(summary.amount),
        isEstimate: summary.isEstimate,
      });
    } else if (summary.kind === "breakdown") {
      unresolvedCategoryNames.push(slice.categoryName);
    }
  }
  resolvedCategories.sort((a, b) => b.amount - a.amount);
  let categoryChartData = resolvedCategories;
  if (resolvedCategories.length > CATEGORY_LIMIT + 1) {
    const top = resolvedCategories.slice(0, CATEGORY_LIMIT);
    const rest = resolvedCategories.slice(CATEGORY_LIMIT);
    const restTotal = rest.reduce((sum, c) => sum + c.amount, 0);
    const restIsEstimate = rest.some((c) => c.isEstimate);
    categoryChartData = [
      ...top,
      { categoryId: null, categoryName: "Otros", amount: restTotal, isEstimate: restIsEstimate },
    ];
  }

  // ── Suscripciones más costosas (anualizado) ─────────────────────────
  const topSubscriptionsWithRank = await Promise.all(
    topSubscriptionsRaw.map(async (sub) => {
      const occurrencesPerYear = annualizedOccurrences({
        billingFrequency: sub.billingFrequency,
        customIntervalCount: sub.customIntervalCount,
        customIntervalUnit: sub.customIntervalUnit,
      });
      const annualizedAmount = (Number(sub.amount) * occurrencesPerYear).toFixed(4);
      const converted = await convertToBaseCurrency(
        prisma,
        authUser.id,
        annualizedAmount,
        sub.currency,
        baseCurrency
      );
      return {
        item: {
          id: sub.id,
          name: sub.name,
          categoryName: sub.category?.name ?? null,
          annualizedAmount,
          currency: sub.currency,
          baseCurrencyEquivalent: converted
            ? {
                amount: converted.amount,
                currency: converted.currency,
                isEstimate: converted.isEstimate,
              }
            : null,
        } satisfies TopSubscriptionItem,
        rankValue: converted ? Number(converted.amount) : Number(annualizedAmount),
        resolved: converted !== null,
      };
    })
  );
  const topSubscriptions: TopSubscriptionItem[] = topSubscriptionsWithRank
    .sort((a, b) => {
      if (a.resolved !== b.resolved) return a.resolved ? -1 : 1;
      return b.rankValue - a.rankValue;
    })
    .slice(0, TOP_SUBSCRIPTIONS_LIMIT)
    .map((entry) => entry.item);

  const periodLabel = format(now, "MMMM yyyy", { locale: es });

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-medium">Hola, {user.name.split(" ")[0]}</h1>
          <p className="text-muted-foreground text-sm capitalize">Resumen de {periodLabel}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm">
            <Link href="/suscripciones/nueva">
              <Plus data-icon="inline-start" /> Nueva suscripción
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/pagos">
              <Receipt data-icon="inline-start" /> Pagos
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/notificaciones">
              <Bell data-icon="inline-start" /> Notificaciones
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          title="Gasto previsto (mes)"
          icon={TrendingUp}
          summary={forecastSummary}
          hint="Normalizado a mensual"
        />
        <StatTile
          title="Gasto real (mes)"
          icon={Wallet}
          summary={actualSummary}
          hint="Pagos registrados"
        />
        <StatTile
          title="Equivalente anual"
          icon={CalendarRange}
          summary={annualSummary}
          hint="Suscripciones activas"
        />
        <StatTile
          title="Ahorro por cancelaciones"
          icon={PiggyBank}
          summary={savingsSummary}
          hint="Al año"
        />
      </div>

      {nextRenewal && (
        <Card className="bg-primary/5">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-2">
            <div className="flex items-center gap-3">
              <CalendarClock aria-hidden className="text-primary size-5" />
              <div>
                <p className="text-sm font-medium">
                  Próximo cobro: {nextRenewal.name} —{" "}
                  {formatMoney({ amount: nextRenewal.amount, currency: nextRenewal.currency })}
                </p>
                <p className="text-muted-foreground text-xs">
                  {format(nextRenewal.nextBillingDate, "EEEE d 'de' MMMM", { locale: es })}
                </p>
              </div>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link href={`/suscripciones/${nextRenewal.id}`}>Ver detalle</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Próximas renovaciones</CardTitle>
            <CardDescription>Cobros previstos en los próximos 14 días</CardDescription>
          </CardHeader>
          <CardContent>
            <UpcomingRenewalsList renewals={upcomingRenewals} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Requiere tu atención</CardTitle>
              <CardDescription>Pruebas por terminar, pagos fallidos y más</CardDescription>
            </div>
            {attentionItems.length > 0 && (
              <Badge variant="secondary">{attentionItems.length}</Badge>
            )}
          </CardHeader>
          <CardContent>
            <AttentionList items={attentionItems} />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Gasto mensual</CardTitle>
            <CardDescription>Últimos {TREND_MONTHS} meses, gasto real registrado</CardDescription>
          </CardHeader>
          <CardContent>
            <SpendTrendChart data={spendTrend} baseCurrency={baseCurrency} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribución por categoría</CardTitle>
            <CardDescription className="capitalize">{periodLabel}</CardDescription>
          </CardHeader>
          <CardContent>
            <CategoryDistributionChart
              data={categoryChartData}
              baseCurrency={baseCurrency}
              unresolvedCategoryNames={unresolvedCategoryNames}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Suscripciones más costosas</CardTitle>
          <CardDescription>Ordenadas por costo anualizado</CardDescription>
        </CardHeader>
        <CardContent>
          <TopSubscriptionsList subscriptions={topSubscriptions} />
        </CardContent>
      </Card>
    </div>
  );
}
