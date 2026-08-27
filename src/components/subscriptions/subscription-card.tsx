"use client";

import Link from "next/link";

import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/subscriptions/status-badge";
import { formatMoney } from "@/lib/domain/money";
import { resolveIcon } from "@/lib/icon-map";
import type { SubscriptionListRow } from "@/components/subscriptions/subscription-table";

export function SubscriptionCardGrid({
  rows,
  selectedIds,
  onToggle,
}: {
  rows: SubscriptionListRow[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {rows.map((row) => {
        const Icon = resolveIcon(row.icon);
        const isSelected = selectedIds.has(row.id);
        return (
          <Card key={row.id} className="relative gap-3 px-4">
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                onToggle(row.id);
              }}
              className="absolute top-3 right-3 z-10"
              aria-label={`Seleccionar ${row.name}`}
            >
              <Checkbox checked={isSelected} onCheckedChange={() => onToggle(row.id)} />
            </button>

            <Link href={`/suscripciones/${row.id}`} className="flex flex-col gap-3">
              <div className="flex items-center gap-3 pr-8">
                <span
                  className="flex size-10 shrink-0 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${row.color}22`, color: row.color }}
                >
                  <Icon className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{row.name}</p>
                  {row.provider && (
                    <p className="text-muted-foreground truncate text-xs">{row.provider}</p>
                  )}
                </div>
              </div>

              <div className="flex items-baseline justify-between">
                <span className="text-lg font-semibold">
                  {formatMoney({ amount: row.amount, currency: row.currency })}
                </span>
                <StatusBadge status={row.status} className="text-xs" />
              </div>

              <p className="text-muted-foreground text-xs">
                Próximo cobro:{" "}
                {new Intl.DateTimeFormat("es-DO", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                }).format(new Date(row.nextBillingDate))}
              </p>

              {(row.category || row.tags.length > 0) && (
                <div className="flex flex-wrap gap-1.5">
                  {row.category && (
                    <Badge
                      variant="outline"
                      style={{ borderColor: row.category.color, color: row.category.color }}
                    >
                      {row.category.name}
                    </Badge>
                  )}
                  {row.tags.map((tag) => (
                    <Badge
                      key={tag.id}
                      variant="outline"
                      style={{ borderColor: tag.color, color: tag.color }}
                    >
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              )}
            </Link>
          </Card>
        );
      })}
    </div>
  );
}
