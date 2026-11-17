import "server-only";

import type { InrUsdRate } from "./currency";

export type InrUsdRateResult =
  | { rate: InrUsdRate; warning: null }
  | { rate: null; warning: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function getLatestInrUsdRate(): Promise<InrUsdRateResult> {
  try {
    const response = await fetch(
      "https://api.frankfurter.dev/v1/latest?base=INR&symbols=USD",
      { next: { revalidate: 3600 } },
    );
    if (!response.ok) {
      throw new Error(`The exchange-rate service returned HTTP ${response.status}.`);
    }

    const payload: unknown = await response.json();
    if (!isRecord(payload) || typeof payload.date !== "string" || !isRecord(payload.rates)) {
      throw new Error("The exchange-rate service returned an invalid response.");
    }

    const usdPerInr = payload.rates.USD;
    if (typeof usdPerInr !== "number" || !Number.isFinite(usdPerInr) || usdPerInr <= 0) {
      throw new Error("The exchange-rate service returned an invalid INR-to-USD rate.");
    }

    return { rate: { usdPerInr, date: payload.date }, warning: null };
  } catch (error) {
    console.error("Could not retrieve the latest INR-to-USD rate:", error);
    return {
      rate: null,
      warning: "The latest FX rate is unavailable; transaction amounts are shown in INR.",
    };
  }
}
