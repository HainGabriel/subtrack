import { z } from "zod";
import { PaymentMethodType } from "@/generated/prisma/enums";
import { ICON_NAMES } from "@/lib/icon-map";

export const COLOR_SWATCHES = [
  "#6366f1",
  "#2a78d6",
  "#1baf7a",
  "#0ca30c",
  "#eda100",
  "#eb6834",
  "#d03b3b",
  "#e87ba4",
  "#4a3aa7",
  "#52514e",
] as const;

export const PAYMENT_METHOD_TYPES = Object.values(PaymentMethodType) as [
  PaymentMethodType,
  ...PaymentMethodType[],
];

export const PAYMENT_METHOD_TYPE_LABELS: Record<PaymentMethodType, string> = {
  CASH: "Efectivo",
  CARD: "Tarjeta",
  BANK_ACCOUNT: "Cuenta bancaria",
  PAYPAL: "PayPal",
  APPLE_PAY: "Apple Pay",
  GOOGLE_PAY: "Google Pay",
  OTHER: "Otro",
};

const hexColorSchema = z
  .string()
  .trim()
  .regex(/^#[0-9a-fA-F]{6}$/, "Elige un color válido");

const iconSchema = z
  .string()
  .trim()
  .refine((v) => ICON_NAMES.includes(v), "Elige un ícono válido");

export const paymentMethodSchema = z
  .object({
    type: z.enum(PAYMENT_METHOD_TYPES, { message: "Elige un tipo válido" }),
    alias: z.string().trim().min(1, "El alias es obligatorio").max(60, "Máximo 60 caracteres"),
    brand: z.string().trim().max(40, "Máximo 40 caracteres").optional(),
    last4: z.string().trim().optional(),
    expMonth: z.number().int().min(1).max(12).optional().nullable(),
    expYear: z.number().int().min(2000).max(2100).optional().nullable(),
    color: hexColorSchema,
    icon: iconSchema,
  })
  .superRefine((data, ctx) => {
    if (data.type === "CARD") {
      if (data.last4 && !/^\d{4}$/.test(data.last4)) {
        ctx.addIssue({
          code: "custom",
          path: ["last4"],
          message: "Ingresa solo los últimos 4 dígitos",
        });
      }
      const hasMonth = data.expMonth !== undefined && data.expMonth !== null;
      const hasYear = data.expYear !== undefined && data.expYear !== null;
      if (hasMonth !== hasYear) {
        ctx.addIssue({
          code: "custom",
          path: ["expYear"],
          message: "Completa el mes y el año de expiración",
        });
      }
    }
  });
export type PaymentMethodInput = z.infer<typeof paymentMethodSchema>;

export const deletePaymentMethodSchema = z.object({
  paymentMethodId: z.string().min(1),
});
