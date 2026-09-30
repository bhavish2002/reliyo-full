import { describe, expect, it } from "vitest";
import {
  convertAmountWithRates,
  formatDisplayMoney,
  getCurrencySymbol,
  FALLBACK_USD_RATES,
} from "@/lib/currency";

describe("currency", () => {
  const rates = FALLBACK_USD_RATES;

  it("converts INR to USD with decimal precision", () => {
    const usd = convertAmountWithRates(9546, "INR", "USD", rates);
    expect(usd).toBeCloseTo(100, 1);
  });

  it("returns same amount when currencies match", () => {
    expect(convertAmountWithRates(500, "INR", "INR", rates)).toBe(500);
  });

  it("formats with two decimal places", () => {
    const formatted = formatDisplayMoney(100, {
      sourceCurrency: "INR",
      preferredCurrency: "USD",
      rates,
    });
    expect(formatted).toMatch(/^\$[\d,]+\.\d{2}$/);
  });

  it("symbol lookup", () => {
    expect(getCurrencySymbol("USD")).toBe("$");
    expect(getCurrencySymbol("INR")).toBe("₹");
  });
});
