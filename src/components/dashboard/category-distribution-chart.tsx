"use client";

import { Bar, BarChart, Cell, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatMoney } from "@/lib/domain/money";

export interface CategorySliceDatum {
  categoryId: string | null;
  categoryName: string;
  amount: number;
  isEstimate: boolean;
}

interface CategoryDistributionChartProps {
  data: CategorySliceDatum[];
  baseCurrency: string;
  /** Categorías excluidas del gráfico por no tener tasa de cambio a la moneda base. */
  unresolvedCategoryNames?: string[];
}

// Los 8 colores categóricos fijos, en el orden establecido por el sistema
// de diseño — nunca reordenados ni ciclados.
const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
  "var(--chart-7)",
  "var(--chart-8)",
];

const chartConfig = {
  amount: { label: "Gasto del mes" },
} satisfies ChartConfig;

export function CategoryDistributionChart({
  data,
  baseCurrency,
  unresolvedCategoryNames,
}: CategoryDistributionChartProps) {
  if (data.length === 0) {
    return (
      <p className="text-muted-foreground py-10 text-center text-sm">
        Sin pagos registrados este mes para distribuir por categoría.
      </p>
    );
  }

  // Recharts dibuja la primera fila arriba cuando el eje Y es categórico;
  // invertimos para que la categoría de mayor gasto quede primero (arriba).
  const chartData = [...data].reverse();

  return (
    <div className="flex flex-col gap-3">
      <ChartContainer
        config={chartConfig}
        className="w-full"
        style={{ height: chartData.length * 32 + 24 }}
      >
        <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 24 }}>
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="categoryName"
            tickLine={false}
            axisLine={false}
            width={120}
            tick={{ fontSize: 12 }}
          />
          <ChartTooltip
            cursor={{ fill: "var(--muted)", opacity: 0.4 }}
            content={
              <ChartTooltipContent
                hideLabel
                formatter={(value, _name, item) => {
                  const point = item?.payload as CategorySliceDatum | undefined;
                  return (
                    <div className="flex w-full items-center justify-between gap-3">
                      <span className="text-muted-foreground">{point?.categoryName}</span>
                      <span className="text-foreground font-mono tabular-nums">
                        {formatMoney({ amount: String(value), currency: baseCurrency })}
                        {point?.isEstimate ? " (estimado)" : ""}
                      </span>
                    </div>
                  );
                }}
              />
            }
          />
          <Bar dataKey="amount" radius={[0, 4, 4, 0]} maxBarSize={20}>
            {chartData.map((entry) => {
              const originalIndex = data.findIndex(
                (d) => d.categoryId === entry.categoryId && d.categoryName === entry.categoryName
              );
              return (
                <Cell
                  key={`${entry.categoryId ?? "sin-categoria"}-${entry.categoryName}`}
                  fill={CHART_COLORS[originalIndex % CHART_COLORS.length]}
                />
              );
            })}
          </Bar>
        </BarChart>
      </ChartContainer>

      {unresolvedCategoryNames && unresolvedCategoryNames.length > 0 && (
        <p className="text-muted-foreground text-xs">
          Sin tasa de cambio para consolidar: {unresolvedCategoryNames.join(", ")}.
        </p>
      )}

      <details className="text-sm">
        <summary className="text-muted-foreground cursor-pointer select-none">
          Ver datos en formato de tabla
        </summary>
        <table className="mt-2 w-full text-left text-sm">
          <caption className="sr-only">Distribución de gasto por categoría este mes</caption>
          <thead>
            <tr className="border-b">
              <th scope="col" className="py-1 pr-2 font-medium">
                Categoría
              </th>
              <th scope="col" className="py-1 font-medium">
                Gasto
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((entry) => (
              <tr
                key={`${entry.categoryId ?? "sin-categoria"}-${entry.categoryName}`}
                className="border-b last:border-0"
              >
                <td className="py-1 pr-2">{entry.categoryName}</td>
                <td className="py-1">
                  {formatMoney({ amount: String(entry.amount), currency: baseCurrency })}
                  {entry.isEstimate ? " (estimado)" : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
