import { describe, it, expect } from "vitest";
import {
  computeNextBillingDate,
  deriveInitialAnchorDay,
  isMonthBasedFrequency,
  annualizedOccurrences,
  type RecurrenceInput,
} from "@/lib/domain/recurrence";

function utc(y: number, m: number, d: number) {
  return new Date(Date.UTC(y, m - 1, d));
}

function iso(date: Date) {
  return date.toISOString().slice(0, 10);
}

describe("computeNextBillingDate — frecuencias simples", () => {
  it("semanal suma 7 días", () => {
    const input: RecurrenceInput = { billingFrequency: "WEEKLY" };
    expect(iso(computeNextBillingDate(input, utc(2026, 3, 10)))).toBe("2026-03-17");
  });

  it("mensual normal (día 15)", () => {
    const input: RecurrenceInput = { billingFrequency: "MONTHLY", billingAnchorDay: 15 };
    expect(iso(computeNextBillingDate(input, utc(2026, 1, 15)))).toBe("2026-02-15");
  });

  it("trimestral suma 3 meses", () => {
    const input: RecurrenceInput = { billingFrequency: "QUARTERLY", billingAnchorDay: 5 };
    expect(iso(computeNextBillingDate(input, utc(2026, 1, 5)))).toBe("2026-04-05");
  });

  it("anual suma 12 meses", () => {
    const input: RecurrenceInput = { billingFrequency: "ANNUAL", billingAnchorDay: 20 };
    expect(iso(computeNextBillingDate(input, utc(2025, 6, 20)))).toBe("2026-06-20");
  });
});

describe("computeNextBillingDate — día 29/30/31 y meses cortos", () => {
  it("31 de enero → 28 de febrero (año no bisiesto), preservando el anchor", () => {
    const input: RecurrenceInput = { billingFrequency: "MONTHLY", billingAnchorDay: 31 };
    const feb = computeNextBillingDate(input, utc(2026, 1, 31));
    expect(iso(feb)).toBe("2026-02-28");
    // El ciclo siguiente debe recuperar el día 31 (no arrastrar el 28).
    const mar = computeNextBillingDate(input, feb);
    expect(iso(mar)).toBe("2026-03-31");
  });

  it("31 de enero → 29 de febrero en año bisiesto (2028)", () => {
    const input: RecurrenceInput = { billingFrequency: "MONTHLY", billingAnchorDay: 31 };
    const feb = computeNextBillingDate(input, utc(2028, 1, 31));
    expect(iso(feb)).toBe("2028-02-29");
    const mar = computeNextBillingDate(input, feb);
    expect(iso(mar)).toBe("2028-03-31");
  });

  it("30 de abril → 30 de mayo (no se ve afectado por abril de 30 días)", () => {
    const input: RecurrenceInput = { billingFrequency: "MONTHLY", billingAnchorDay: 30 };
    expect(iso(computeNextBillingDate(input, utc(2026, 4, 30)))).toBe("2026-05-30");
  });

  it("29 de febrero (bisiesto) anual cae en 28 de febrero al año siguiente", () => {
    const input: RecurrenceInput = { billingFrequency: "ANNUAL", billingAnchorDay: 29 };
    const next = computeNextBillingDate(input, utc(2028, 2, 29));
    expect(iso(next)).toBe("2029-02-28");
    // Y vuelve a caer en 29 en el siguiente año bisiesto (2032).
    const y2030 = computeNextBillingDate(input, next);
    const y2031 = computeNextBillingDate(input, y2030);
    const y2032 = computeNextBillingDate(input, y2031);
    expect(iso(y2032)).toBe("2032-02-29");
  });

  it("31 de diciembre bimestral cruza el fin de año", () => {
    const input: RecurrenceInput = { billingFrequency: "BIMONTHLY", billingAnchorDay: 31 };
    expect(iso(computeNextBillingDate(input, utc(2026, 12, 31)))).toBe("2027-02-28");
  });
});

describe("computeNextBillingDate — frecuencia personalizada", () => {
  it("cada 10 días", () => {
    const input: RecurrenceInput = {
      billingFrequency: "CUSTOM",
      customIntervalCount: 10,
      customIntervalUnit: "DAY",
    };
    expect(iso(computeNextBillingDate(input, utc(2026, 1, 25)))).toBe("2026-02-04");
  });

  it("cada 2 semanas", () => {
    const input: RecurrenceInput = {
      billingFrequency: "CUSTOM",
      customIntervalCount: 2,
      customIntervalUnit: "WEEK",
    };
    expect(iso(computeNextBillingDate(input, utc(2026, 1, 1)))).toBe("2026-01-15");
  });

  it("cada 5 meses preserva el anchor day", () => {
    const input: RecurrenceInput = {
      billingFrequency: "CUSTOM",
      customIntervalCount: 5,
      customIntervalUnit: "MONTH",
      billingAnchorDay: 31,
    };
    expect(iso(computeNextBillingDate(input, utc(2026, 1, 31)))).toBe("2026-06-30");
  });

  it("sin customIntervalUnit lanza error", () => {
    const input: RecurrenceInput = { billingFrequency: "CUSTOM", customIntervalCount: 3 };
    expect(() => computeNextBillingDate(input, utc(2026, 1, 1))).toThrow();
  });
});

describe("deriveInitialAnchorDay", () => {
  it("devuelve el día de la fecha de inicio para frecuencias mensuales", () => {
    const input: RecurrenceInput = { billingFrequency: "MONTHLY" };
    expect(deriveInitialAnchorDay(input, utc(2026, 3, 29))).toBe(29);
  });

  it("devuelve null para frecuencia semanal", () => {
    const input: RecurrenceInput = { billingFrequency: "WEEKLY" };
    expect(deriveInitialAnchorDay(input, utc(2026, 3, 29))).toBeNull();
  });

  it("devuelve null para CUSTOM en días", () => {
    const input: RecurrenceInput = {
      billingFrequency: "CUSTOM",
      customIntervalUnit: "DAY",
    };
    expect(deriveInitialAnchorDay(input, utc(2026, 3, 29))).toBeNull();
  });
});

describe("isMonthBasedFrequency / annualizedOccurrences", () => {
  it("identifica frecuencias basadas en meses", () => {
    expect(isMonthBasedFrequency({ billingFrequency: "MONTHLY" })).toBe(true);
    expect(isMonthBasedFrequency({ billingFrequency: "WEEKLY" })).toBe(false);
    expect(isMonthBasedFrequency({ billingFrequency: "CUSTOM", customIntervalUnit: "DAY" })).toBe(
      false
    );
    expect(isMonthBasedFrequency({ billingFrequency: "CUSTOM", customIntervalUnit: "YEAR" })).toBe(
      true
    );
  });

  it("calcula ocurrencias anualizadas", () => {
    expect(annualizedOccurrences({ billingFrequency: "MONTHLY" })).toBe(12);
    expect(annualizedOccurrences({ billingFrequency: "WEEKLY" })).toBe(52);
    expect(annualizedOccurrences({ billingFrequency: "ANNUAL" })).toBe(1);
  });
});
