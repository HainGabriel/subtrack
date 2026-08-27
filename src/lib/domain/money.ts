/**
 * Utilidades de moneda. Los importes se manejan como `Decimal` de Prisma
 * en la base de datos; en el dominio los tratamos como `string` (nunca
 * `number`, para no perder precisión) y solo se convierten a `number`
 * justo antes de formatear para mostrar.
 */

export interface Money {
  amount: string;
  currency: string;
}

const currencyLocale: Record<string, string> = {
  DOP: "es-DO",
  USD: "en-US",
  EUR: "es-ES",
  MXN: "es-MX",
  COP: "es-CO",
  ARS: "es-AR",
  GBP: "en-GB",
};

export function formatMoney(money: Money, locale = "es-DO"): string {
  const resolvedLocale = currencyLocale[money.currency] ?? locale;
  try {
    return new Intl.NumberFormat(resolvedLocale, {
      style: "currency",
      currency: money.currency,
      currencyDisplay: "narrowSymbol",
    }).format(Number(money.amount));
  } catch {
    // Código de moneda no reconocido por Intl (poco común): degrada con 2 decimales.
    return `${money.currency} ${Number(money.amount).toFixed(2)}`;
  }
}

export function addMoney(a: string, b: string): string {
  // Aritmética decimal en enteros de centésimas de centavo (10^4) para
  // evitar errores de coma flotante al sumar muchos importes.
  const SCALE = 10000n;
  const toScaled = (v: string) => {
    const [int, frac = ""] = v.split(".");
    const fracPadded = (frac + "0000").slice(0, 4);
    const sign = int.startsWith("-") ? -1n : 1n;
    const intAbs = BigInt(int.replace("-", "") || "0");
    return sign * (intAbs * SCALE + BigInt(fracPadded));
  };
  const scaled = toScaled(a) + toScaled(b);
  const negative = scaled < 0n;
  const abs = negative ? -scaled : scaled;
  const intPart = abs / SCALE;
  const fracPart = (abs % SCALE).toString().padStart(4, "0");
  return `${negative ? "-" : ""}${intPart}.${fracPart}`;
}

/**
 * Suma importes que pueden estar en distintas monedas, agrupando por
 * moneda. NUNCA suma valores de monedas distintas como si fueran
 * equivalentes — para eso se necesita convertir primero con una tasa
 * (ver exchange-rate.ts).
 */
export function groupByCurrency(items: Money[]): Record<string, string> {
  const totals: Record<string, string> = {};
  for (const item of items) {
    totals[item.currency] = addMoney(totals[item.currency] ?? "0", item.amount);
  }
  return totals;
}
