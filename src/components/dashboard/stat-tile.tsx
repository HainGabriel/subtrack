import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/domain/money";
import { cn } from "@/lib/utils";

/**
 * Resumen de un importe que puede estar en varias monedas:
 * - "single": se pudo consolidar en una sola moneda (la base del usuario,
 *   posiblemente convertida y marcada como estimado).
 * - "breakdown": no había tasa de conversión para alguna moneda — se
 *   muestra el desglose por moneda sin sumar, nunca un total inventado.
 * - "empty": no hay datos para el período.
 */
export type MoneySummary =
  | { kind: "single"; amount: string; currency: string; isEstimate: boolean }
  | { kind: "breakdown"; totals: Record<string, string> }
  | { kind: "empty" };

interface StatTileProps {
  title: string;
  icon: LucideIcon;
  summary: MoneySummary;
  hint?: string;
  className?: string;
}

export function StatTile({ title, icon: Icon, summary, hint, className }: StatTileProps) {
  return (
    <Card className={cn("h-full", className)}>
      <CardHeader className="flex-row items-center justify-between gap-2 pb-0">
        <span className="text-muted-foreground text-sm">{title}</span>
        <Icon aria-hidden className="text-muted-foreground size-4" />
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-end gap-1">
        {summary.kind === "single" && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-heading text-2xl font-medium tabular-nums">
              {formatMoney({ amount: summary.amount, currency: summary.currency })}
            </span>
            {summary.isEstimate && (
              <Badge variant="outline" className="text-muted-foreground">
                Estimado
              </Badge>
            )}
          </div>
        )}

        {summary.kind === "breakdown" && (
          <div>
            <dl className="flex flex-col gap-0.5">
              {Object.entries(summary.totals).map(([currency, amount]) => (
                <div key={currency} className="flex items-baseline justify-between gap-2">
                  <dt className="sr-only">{currency}</dt>
                  <dd className="font-heading text-lg font-medium tabular-nums">
                    {formatMoney({ amount, currency })}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="text-muted-foreground mt-1 text-xs">
              Sin tasa de cambio registrada para consolidar en una sola moneda.
            </p>
          </div>
        )}

        {summary.kind === "empty" && (
          <span className="text-muted-foreground font-heading text-2xl font-medium">—</span>
        )}

        {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
      </CardContent>
    </Card>
  );
}
