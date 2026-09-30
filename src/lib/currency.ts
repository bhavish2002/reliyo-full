/**
 * Display exchange rates for dashboard currency conversion.
 * Fetches live mid-market rates (Frankfurter) with cached fallback.
 * Display-only — payments/settlement use each task's native currency.
 */

export const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: "₹",
  USD: "$",
  GBP: "£",
  EUR: "€",
  CAD: "C$",
  AUD: "A$",
  JPY: "¥",
  BRL: "R$",
  ZAR: "R",
  AED: "د.إ",
  SGD: "S$",
  NGN: "₦",
};

/** Fallback: units of each currency per 1 USD (updated periodically). */
export const FALLBACK_USD_RATES: Record<string, number> = {
  USD: 1,
  INR: 95.46,
  GBP: 0.739,
  EUR: 0.866,
  CAD: 1.393,
  AUD: 1.414,
  JPY: 159.09,
  BRL: 5.156,
  ZAR: 16.134,
  AED: 3.673,
  SGD: 1.279,
  NGN: 1359.84,
};

const CACHE_KEY = "reliyo_fx_usd_rates_v2";
const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours
const FX_API_URL = "https://open.er-api.com/v6/latest/USD";

export type UsdRatesTable = Record<string, number>;

let memoryRates: UsdRatesTable | null = null;

function readCache(): { rates: UsdRatesTable; fetchedAt: number } | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as { rates: UsdRatesTable; fetchedAt: number };
  } catch {
    return null;
  }
}

function writeCache(rates: UsdRatesTable): void {
  try {
    sessionStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ rates, fetchedAt: Date.now() }),
    );
  } catch {
    /* ignore quota */
  }
}

export function getActiveUsdRates(): UsdRatesTable {
  if (memoryRates) return memoryRates;
  const cached = readCache();
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    memoryRates = cached.rates;
    return cached.rates;
  }
  memoryRates = { ...FALLBACK_USD_RATES };
  return memoryRates;
}

function buildRatesTable(live: Record<string, number>): UsdRatesTable {
  const rates: UsdRatesTable = { USD: 1 };
  for (const code of Object.keys(FALLBACK_USD_RATES)) {
    if (code === "USD") continue;
    const value = live[code];
    rates[code] =
      typeof value === "number" && Number.isFinite(value) && value > 0
        ? value
        : FALLBACK_USD_RATES[code];
  }
  return rates;
}

/** Fetch latest USD-base rates; returns cached/fallback on failure. */
export async function refreshExchangeRates(): Promise<UsdRatesTable> {
  const cached = readCache();
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    memoryRates = cached.rates;
    return cached.rates;
  }

  try {
    const res = await fetch(FX_API_URL);
    if (!res.ok) throw new Error(`FX ${res.status}`);
    const body = (await res.json()) as {
      result?: string;
      rates?: Record<string, number>;
    };
    if (body.result !== "success" || !body.rates) {
      throw new Error("FX payload invalid");
    }
    const rates = buildRatesTable(body.rates);
    memoryRates = rates;
    writeCache(rates);
    return rates;
  } catch {
    memoryRates = { ...FALLBACK_USD_RATES };
    return memoryRates;
  }
}

export function normalizeCurrencyCode(code?: string | null): string {
  return (code || "INR").toUpperCase().trim() || "INR";
}

export function getCurrencySymbol(code?: string | null): string {
  const c = normalizeCurrencyCode(code);
  return CURRENCY_SYMBOLS[c] ?? `${c} `;
}

function rateFor(rates: UsdRatesTable, code: string): number {
  const c = normalizeCurrencyCode(code);
  return rates[c] ?? FALLBACK_USD_RATES[c] ?? 1;
}

/** Convert using USD cross-rates (amount in `from` → amount in `to`). */
export function convertAmountWithRates(
  amount: number,
  fromCurrency: string | null | undefined,
  toCurrency: string | null | undefined,
  rates: UsdRatesTable = getActiveUsdRates(),
): number {
  const from = normalizeCurrencyCode(fromCurrency);
  const to = normalizeCurrencyCode(toCurrency);
  if (from === to) return amount;

  const fromPerUsd = rateFor(rates, from);
  const toPerUsd = rateFor(rates, to);
  const usd = from === "USD" ? amount : amount / fromPerUsd;
  const converted = to === "USD" ? usd : usd * toPerUsd;
  return converted;
}

export interface FormatMoneyOptions {
  sourceCurrency?: string | null;
  preferredCurrency?: string | null;
  decimals?: number;
  localeFormat?: boolean;
  rates?: UsdRatesTable;
}

export function formatDisplayMoney(
  amount: number,
  options: FormatMoneyOptions = {},
): string {
  const preferred = normalizeCurrencyCode(options.preferredCurrency ?? "INR");
  const source = normalizeCurrencyCode(options.sourceCurrency ?? preferred);
  const rates = options.rates ?? getActiveUsdRates();
  const converted = convertAmountWithRates(amount, source, preferred, rates);
  const decimals = options.decimals ?? 2;
  const symbol = getCurrencySymbol(preferred);
  const factor = 10 ** decimals;
  const rounded = Math.round(converted * factor) / factor;
  const value =
    options.localeFormat !== false
      ? rounded.toLocaleString(undefined, {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        })
      : rounded.toFixed(decimals);
  return `${symbol}${value}`;
}

export function formatTaskMoney(
  amount: number,
  task: { currency?: string | null; currencySymbol?: string | null },
  preferredCurrency: string,
  rates?: UsdRatesTable,
): string {
  return formatDisplayMoney(amount, {
    sourceCurrency: task.currency ?? inferCurrencyFromSymbol(task.currencySymbol),
    preferredCurrency,
    rates,
  });
}

function inferCurrencyFromSymbol(symbol?: string | null): string {
  if (!symbol) return "INR";
  const entry = Object.entries(CURRENCY_SYMBOLS).find(([, s]) => s === symbol);
  return entry?.[0] ?? "INR";
}

/** @deprecated use convertAmountWithRates */
export function convertAmount(
  amount: number,
  fromCurrency?: string | null,
  toCurrency?: string | null,
): number {
  return convertAmountWithRates(amount, fromCurrency, toCurrency);
}

export const FIXED_RATES_TO_INR = FALLBACK_USD_RATES;
