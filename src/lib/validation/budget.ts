import { z } from "zod";
import { BudgetScope, BudgetPeriod } from "@/generated/prisma/enums";

export const BUDGET_SCOPES = Object.values(BudgetScope) as [BudgetScope, ...BudgetScope[]];
export const BUDGET_PERIODS = Object.values(BudgetPeriod) as [BudgetPeriod, ...BudgetPeriod[]];

export const BUDGET_SCOPE_LABELS: Record<BudgetScope, string> = {
  GLOBAL: "Global",
  CATEGORY: "Por categoría",
};

export const BUDGET_PERIOD_LABELS: Record<BudgetPeriod, string> = {
  MONTHLY: "Mensual",
  ANNUAL: "Anual",
};

const amountSchema = z
  .string()
  .trim()
  .min(1, "El importe es obligatorio")
  .refine((v) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0;
  }, "El importe debe ser mayor a 0");

export const budgetSchema = z
  .object({
    scope: z.enum(BUDGET_SCOPES, { message: "Elige un alcance válido" }),
    categoryId: z.string().min(1).optional().nullable(),
    period: z.enum(BUDGET_PERIODS, { message: "Elige un período válido" }),
    amount: amountSchema,
    currency: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{3}$/, "Elige una moneda válida"),
    alertThresholdPercent: z.number().int().min(0).max(100),
  })
  .superRefine((data, ctx) => {
    if (data.scope === "CATEGORY" && !data.categoryId) {
      ctx.addIssue({
        code: "custom",
        path: ["categoryId"],
        message: "Elige una categoría",
      });
    }
  });
export type BudgetInput = z.infer<typeof budgetSchema>;
