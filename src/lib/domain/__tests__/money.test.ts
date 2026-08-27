import { describe, it, expect } from "vitest";
import { addMoney, groupByCurrency, formatMoney } from "@/lib/domain/money";

describe("addMoney", () => {
  it("suma decimales simples sin errores de coma flotante", () => {
    expect(addMoney("0.1", "0.2")).toBe("0.3000");
  });

  it("suma enteros grandes", () => {
    expect(addMoney("1000000", "2500000.50")).toBe("3500000.5000");
  });

  it("maneja negativos", () => {
    expect(addMoney("10", "-4.5")).toBe("5.5000");
    expect(addMoney("-10", "-5")).toBe("-15.0000");
  });

  it("maneja cero", () => {
    expect(addMoney("0", "0")).toBe("0.0000");
  });
});

describe("groupByCurrency", () => {
  it("agrupa y suma por moneda sin mezclar monedas distintas", () => {
    const totals = groupByCurrency([
      { amount: "10", currency: "USD" },
      { amount: "5", currency: "USD" },
      { amount: "100", currency: "DOP" },
    ]);
    expect(totals.USD).toBe("15.0000");
    expect(totals.DOP).toBe("100.0000");
    expect(Object.keys(totals).sort()).toEqual(["DOP", "USD"]);
  });

  it("devuelve objeto vacío para lista vacía", () => {
    expect(groupByCurrency([])).toEqual({});
  });
});

describe("formatMoney", () => {
  it("formatea DOP con el locale correspondiente", () => {
    const result = formatMoney({ amount: "1500.5", currency: "DOP" });
    expect(result).toMatch(/1[.,]500[.,]50|1,500\.50|1\.500,50/);
  });

  it("no lanza para un código de moneda no reconocido por Intl", () => {
    expect(() => formatMoney({ amount: "10", currency: "XXX" })).not.toThrow();
  });
});
