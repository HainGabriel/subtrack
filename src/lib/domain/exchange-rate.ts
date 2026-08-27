import type { PrismaClient } from "@/generated/prisma/client";

export interface ConversionResult {
  amount: string;
  currency: string;
  isEstimate: boolean;
  rateAsOfDate: Date | null;
}

/**
 * Convierte un importe a la moneda base del usuario usando la tasa
 * manual más reciente disponible (con fecha <= hoy). Si no hay moneda
 * a convertir (misma moneda) el resultado es exacto; si no hay tasa
 * registrada, se retorna `null` para que el llamador decida cómo
 * mostrar "sin tasa disponible" en vez de inventar un número.
 */
export async function convertToBaseCurrency(
  prisma: PrismaClient,
  userId: string,
  amount: string,
  fromCurrency: string,
  baseCurrency: string
): Promise<ConversionResult | null> {
  if (fromCurrency === baseCurrency) {
    return { amount, currency: baseCurrency, isEstimate: false, rateAsOfDate: null };
  }

  const direct = await prisma.exchangeRate.findFirst({
    where: {
      userId,
      baseCurrency: fromCurrency,
      quoteCurrency: baseCurrency,
      asOfDate: { lte: new Date() },
    },
    orderBy: { asOfDate: "desc" },
  });
  if (direct) {
    return {
      amount: (Number(amount) * Number(direct.rate)).toFixed(4),
      currency: baseCurrency,
      isEstimate: true,
      rateAsOfDate: direct.asOfDate,
    };
  }

  const inverse = await prisma.exchangeRate.findFirst({
    where: { userId, baseCurrency, quoteCurrency: fromCurrency, asOfDate: { lte: new Date() } },
    orderBy: { asOfDate: "desc" },
  });
  if (inverse && Number(inverse.rate) !== 0) {
    return {
      amount: (Number(amount) / Number(inverse.rate)).toFixed(4),
      currency: baseCurrency,
      isEstimate: true,
      rateAsOfDate: inverse.asOfDate,
    };
  }

  return null;
}
