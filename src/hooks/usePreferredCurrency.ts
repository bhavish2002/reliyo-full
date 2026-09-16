import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getUserSettings } from "@/lib/userSettings";
import {
  formatDisplayMoney,
  formatTaskMoney,
  getCurrencySymbol,
  convertAmountWithRates,
  refreshExchangeRates,
  getActiveUsdRates,
  type FormatMoneyOptions,
  type UsdRatesTable,
} from "@/lib/currency";

/** User dashboard display currency from server-backed preferences. */
export function usePreferredCurrency() {
  const { user } = useAuth();
  const [rates, setRates] = useState<UsdRatesTable>(() => getActiveUsdRates());

  useEffect(() => {
    let cancelled = false;
    void refreshExchangeRates().then((r) => {
      if (!cancelled) setRates(r);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const preferredCurrency = useMemo(() => {
    if (!user) return "INR";
    return getUserSettings(user.id, user.preferences).preferredCurrency;
  }, [user]);

  const symbol = getCurrencySymbol(preferredCurrency);

  return {
    preferredCurrency,
    symbol,
    rates,
    convert: (amount: number, sourceCurrency?: string | null) =>
      convertAmountWithRates(amount, sourceCurrency, preferredCurrency, rates),
    format: (amount: number, options?: Omit<FormatMoneyOptions, "preferredCurrency" | "rates">) =>
      formatDisplayMoney(amount, { ...options, preferredCurrency, rates }),
    formatTask: (
      amount: number,
      task: { currency?: string | null; currencySymbol?: string | null },
    ) => formatTaskMoney(amount, task, preferredCurrency, rates),
  };
}
