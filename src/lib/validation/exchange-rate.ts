import { z } from "zod";

const currencyCode = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{3}$/, "Código de moneda inválido");

export const exchangeRateSchema = z
  .object({
    baseCurrency: currencyCode,
    quoteCurrency: currencyCode,
    rate: z
      .string()
      .trim()
      .min(1, "La tasa es obligatoria")
      .refine((v) => {
        const n = Number(v);
        return Number.isFinite(n) && n > 0;
      }, "La tasa debe ser mayor a 0"),
    asOfDate: z.string().trim().min(1, "Elige una fecha"),
  })
  .refine((data) => data.baseCurrency !== data.quoteCurrency, {
    message: "Elige dos monedas distintas",
    path: ["quoteCurrency"],
  });
export type ExchangeRateInput = z.infer<typeof exchangeRateSchema>;
