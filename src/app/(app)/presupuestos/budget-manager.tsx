"use client";

import { useState } from "react";
import {
  MoreVertical,
  Plus,
  Pencil,
  Trash2,
  PiggyBank,
  CircleCheck,
  TriangleAlert,
  OctagonAlert,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { resolveIcon } from "@/lib/icon-map";
import { formatMoney } from "@/lib/domain/money";
import { BUDGET_PERIOD_LABELS } from "@/lib/validation/budget";
import { BudgetFormDialog, type BudgetFormValue } from "./budget-form-dialog";
import { DeleteBudgetDialog } from "./delete-budget-dialog";

export interface BudgetRow {
  id: string;
  scope: BudgetFormValue["scope"];
  categoryId: string | null;
  categoryName: string | null;
  categoryColor: string | null;
  categoryIcon: string | null;
  period: BudgetFormValue["period"];
  amount: string;
  currency: string;
  alertThresholdPercent: number;
  actual: string;
  actualOtherCurrencies: Array<{ currency: string; amount: string }>;
  forecast: string | null;
  percent: number;
  status: "good" | "warning" | "critical";
}

const statusMeta: Record<
  BudgetRow["status"],
  { label: string; icon: typeof CircleCheck; color: string }
> = {
  good: { label: "Dentro del presupuesto", icon: CircleCheck, color: "var(--status-good)" },
  warning: { label: "Cerca del límite", icon: TriangleAlert, color: "var(--status-warning)" },
  critical: { label: "Presupuesto excedido", icon: OctagonAlert, color: "var(--status-critical)" },
};

export function BudgetManager({
  budgets,
  categories,
  defaultCurrency,
}: {
  budgets: BudgetRow[];
  categories: Array<{ id: string; name: string }>;
  defaultCurrency: string;
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<BudgetFormValue | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null);

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(budget: BudgetRow) {
    setEditing({
      id: budget.id,
      scope: budget.scope,
      categoryId: budget.categoryId,
      period: budget.period,
      amount: budget.amount,
      currency: budget.currency,
      alertThresholdPercent: budget.alertThresholdPercent,
    });
    setFormOpen(true);
  }

  function openDelete(budget: BudgetRow) {
    const label = budget.scope === "GLOBAL" ? "Global" : (budget.categoryName ?? "Categoría");
    setDeleteTarget({ id: budget.id, label: `${label} · ${BUDGET_PERIOD_LABELS[budget.period]}` });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold">Presupuestos</h1>
          <p className="text-muted-foreground text-sm">
            Controla tu gasto global y por categoría con límites y alertas.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="size-4" />
          Nuevo presupuesto
        </Button>
      </div>

      {budgets.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <PiggyBank />
            </EmptyMedia>
            <EmptyTitle>Sin presupuestos todavía</EmptyTitle>
            <EmptyDescription>
              Crea un presupuesto global o por categoría para vigilar tu gasto.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={openCreate}>
              <Plus className="size-4" />
              Nuevo presupuesto
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {budgets.map((budget) => {
            const Icon = budget.scope === "CATEGORY" ? resolveIcon(budget.categoryIcon) : PiggyBank;
            const meta = statusMeta[budget.status];
            const StatusIcon = meta.icon;
            const clampedPercent = Math.min(budget.percent, 100);

            return (
              <Card key={budget.id}>
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div
                        className="flex size-8 shrink-0 items-center justify-center rounded-lg"
                        style={{
                          backgroundColor: `${budget.categoryColor ?? "#6366f1"}22`,
                          color: budget.categoryColor ?? "var(--primary)",
                        }}
                      >
                        <Icon className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="truncate">
                          {budget.scope === "GLOBAL"
                            ? "Global"
                            : (budget.categoryName ?? "Categoría")}
                        </CardTitle>
                        <Badge variant="secondary">{BUDGET_PERIOD_LABELS[budget.period]}</Badge>
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Acciones del presupuesto"
                        >
                          <MoreVertical className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => openEdit(budget)}>
                          <Pencil className="size-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem variant="destructive" onSelect={() => openDelete(budget)}>
                          <Trash2 className="size-4" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <div style={{ "--primary": meta.color } as React.CSSProperties}>
                    <Progress value={clampedPercent} />
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {formatMoney({ amount: budget.actual, currency: budget.currency })} de{" "}
                      {formatMoney({ amount: budget.amount, currency: budget.currency })}
                    </span>
                    <span className="font-medium">{Math.round(budget.percent)}%</span>
                  </div>

                  <div
                    className="flex items-center gap-1.5 text-sm font-medium"
                    style={{ color: meta.color }}
                  >
                    <StatusIcon className="size-4" />
                    {meta.label}
                  </div>

                  {budget.forecast && (
                    <p className="text-muted-foreground text-sm">
                      Gasto previsto:{" "}
                      {formatMoney({ amount: budget.forecast, currency: budget.currency })}/mes
                    </p>
                  )}

                  {budget.actualOtherCurrencies.length > 0 && (
                    <p className="text-muted-foreground text-xs">
                      También gastaste{" "}
                      {budget.actualOtherCurrencies
                        .map((o) => formatMoney({ amount: o.amount, currency: o.currency }))
                        .join(", ")}{" "}
                      en este período (no incluido arriba, distinta moneda).
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <BudgetFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        budget={editing}
        categories={categories}
        defaultCurrency={defaultCurrency}
      />
      <DeleteBudgetDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        budget={deleteTarget}
      />
    </div>
  );
}
