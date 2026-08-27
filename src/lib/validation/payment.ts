import { z } from "zod";

/**
 * Importe monetario como string decimal (nunca `number`, ver money.ts).
 * Acepta hasta 4 decimales, sin signo (los pagos siempre son positivos).
 */
const moneyAmountSchema = z
  .string()
  .trim()
  .min(1, "Ingresa un importe")
  .regex(/^\d{1,12}(\.\d{1,4})?$/, "Importe inválido")
  .refine((v) => Number(v) > 0, "El importe debe ser mayor que cero");

const currencySchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{3}$/, "Moneda inválida (usa el código de 3 letras, ej. USD)");

export const recordAdHocPaymentSchema = z.object({
  subscriptionId: z.string().min(1, "Elige una suscripción"),
  dueDate: z.coerce.date({ error: "Fecha de vencimiento inválida" }),
  paidDate: z.coerce.date({ error: "Fecha de pago inválida" }),
  amount: moneyAmountSchema.optional(),
  currency: currencySchema.optional(),
  paymentMethodId: z.string().trim().min(1).optional().nullable(),
  note: z.string().trim().max(2000).optional().nullable(),
});
export type RecordAdHocPaymentInput = z.infer<typeof recordAdHocPaymentSchema>;

export const paymentStatusSchema = z.enum([
  "SCHEDULED",
  "PAID",
  "SKIPPED",
  "FAILED",
  "REFUNDED",
  "CANCELLED",
]);

/**
 * Corrección de un pago ya existente. NUNCA incluye `dueDate`: el ciclo de
 * un pago ya creado es inmutable — si el usuario necesita otro ciclo debe
 * registrar un pago nuevo (ver recordAdHocPaymentAction).
 */
export const updatePaymentSchema = z.object({
  paymentId: z.string().min(1),
  amount: moneyAmountSchema.optional(),
  currency: currencySchema.optional(),
  paymentMethodId: z.string().trim().min(1).optional().nullable(),
  note: z.string().trim().max(2000).optional().nullable(),
  status: paymentStatusSchema.optional(),
});
export type UpdatePaymentInput = z.infer<typeof updatePaymentSchema>;
