import { requireUser } from "@/lib/auth/guard";
import { prisma } from "@/lib/prisma";
import {
  getActualSpend,
  getForecastedMonthlySpend,
  monthBounds,
  yearBounds,
} from "@/lib/domain/spend-aggregation";
import { BudgetManager, type BudgetRow } from "./budget-manager";

export default async function PresupuestosPage() {
  const user = await requireUser();

  const [budgets, categories, settings] = await Promise.all([
    prisma.budget.findMany({
      where: { userId: user.id },
      orderBy: [{ scope: "asc" }, { period: "asc" }],
      include: { category: true },
    }),
    prisma.category.findMany({
      where: { userId: user.id, archivedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.userSettings.findUnique({ where: { userId: user.id }, select: { baseCurrency: true } }),
  ]);

  const rows: BudgetRow[] = await Promise.all(
    budgets.map(async (budget) => {
      const range = budget.period === "MONTHLY" ? monthBounds() : yearBounds();
      const actualByCurrency = await getActualSpend(
        prisma,
        user.id,
        range,
        budget.categoryId ?? undefined
      );
      const actual = actualByCurrency[budget.currency] ?? "0";
      const actualOtherCurrencies = Object.entries(actualByCurrency)
        .filter(([currency]) => currency !== budget.currency)
        .map(([currency, amount]) => ({ currency, amount }));

      let forecast: string | null = null;
      if (budget.period === "MONTHLY") {
        const forecastByCurrency = await getForecastedMonthlySpend(
          prisma,
          user.id,
          budget.categoryId ?? undefined
        );
        forecast = forecastByCurrency[budget.currency] ?? null;
      }

      const amountNumber = Number(budget.amount);
      const percent = amountNumber > 0 ? (Number(actual) / amountNumber) * 100 : 0;
      const status: BudgetRow["status"] =
        percent >= 100 ? "critical" : percent >= budget.alertThresholdPercent ? "warning" : "good";

      return {
        id: budget.id,
        scope: budget.scope,
        categoryId: budget.categoryId,
        categoryName: budget.category?.name ?? null,
        categoryColor: budget.category?.color ?? null,
        categoryIcon: budget.category?.icon ?? null,
        period: budget.period,
        amount: budget.amount.toString(),
        currency: budget.currency,
        alertThresholdPercent: budget.alertThresholdPercent,
        actual,
        actualOtherCurrencies,
        forecast,
        percent,
        status,
      };
    })
  );

  return (
    <BudgetManager
      budgets={rows}
      categories={categories}
      defaultCurrency={settings?.baseCurrency ?? "DOP"}
    />
  );
}
