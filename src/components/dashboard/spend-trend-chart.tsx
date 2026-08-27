"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatMoney } from "@/lib/domain/money";

export interface SpendTrendPoint {
  key: string;
  label: string;
  /** Total del mes en la moneda base, o `null` si no había tasa de cambio para consolidarlo. */
  amount: number | null;
  isEstimate: boolean;
  totalsByCurrency: Record<string, string>;
}

interface SpendTrendChartProps {
  data: SpendTrendPoint[];
  baseCurrency: string;
}

const chartConfig = {
  amount: { label: "Gasto real", color: "var(--chart-1)" },
} satisfies ChartConfig;

export function SpendTrendChart({ data, baseCurrency }: SpendTrendChartProps) {
  const hasAnyData = data.some((d) => d.amount !== null && d.amount > 0);

  return (
    <div className="flex flex-col gap-3">
      {hasAnyData ? (
        <ChartContainer config={chartConfig} className="h-56 w-full">
          <BarChart data={data} barCategoryGap="24%">
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} interval={0} />
            <YAxis width={0} tickLine={false} axisLine={false} tickFormatter={() => ""} />
            <ChartTooltip
              cursor={{ fill: "var(--muted)", opacity: 0.4 }}
              content={
                <ChartTooltipContent
                  labelKey="label"
                  formatter={(value, _name, item) => {
                    const point = item?.payload as SpendTrendPoint | undefined;
                    if (!point || point.amount === null) {
                      return <span className="text-muted-foreground">Sin tasa de cambio</span>;
                    }
                    return (
                      <span className="text-foreground font-mono tabular-nums">
                        {formatMoney({ amount: String(value), currency: baseCurrency })}
                        {point.isEstimate ? " (estimado)" : ""}
                      </span>
                    );
                  }}
                />
              }
            />
            <Bar
              dataKey="amount"
              fill="var(--color-amount)"
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
            />
          </BarChart>
        </ChartContainer>
      ) : (
        <p className="text-muted-foreground py-10 text-center text-sm">
          Todavía no hay pagos registrados en este período.
        </p>
      )}

      <details className="text-sm">
        <summary className="text-muted-foreground cursor-pointer select-none">
          Ver datos en formato de tabla
        </summary>
        <table className="mt-2 w-full text-left text-sm">
          <caption className="sr-only">Gasto real mensual, últimos meses</caption>
          <thead>
            <tr className="border-b">
              <th scope="col" className="py-1 pr-2 font-medium">
                Mes
              </th>
              <th scope="col" className="py-1 font-medium">
                Gasto
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((point) => (
              <tr key={point.key} className="border-b last:border-0">
                <td className="py-1 pr-2">{point.label}</td>
                <td className="py-1">
                  {point.amount !== null
                    ? `${formatMoney({ amount: String(point.amount), currency: baseCurrency })}${point.isEstimate ? " (estimado)" : ""}`
                    : Object.entries(point.totalsByCurrency)
                        .map(([currency, amount]) => formatMoney({ amount, currency }))
                        .join(" + ") || "Sin gasto"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
