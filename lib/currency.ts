export type InrUsdRate = {
  usdPerInr: number;
  date: string;
};

export function formatInrPaise(amountPaise: number): string {
  if (!Number.isSafeInteger(amountPaise) || amountPaise < 0) {
    throw new Error("Collection prices must be a non-negative integer number of paise.");
  }
  const rupees = Math.floor(amountPaise / 100);
  const paise = amountPaise % 100;
  return `₹${rupees.toLocaleString("en-IN")}.${String(paise).padStart(2, "0")}`;
}

export function formatAdminMoney(amountInr: number, rate: InrUsdRate | null): string {
  if (!rate) {
    return `INR ${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(amountInr)}`;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(amountInr * rate.usdPerInr);
}

export function formatAdminAxisMoney(amountInr: number, rate: InrUsdRate | null): string {
  const amount = amountInr * (rate?.usdPerInr ?? 1);
  const formatted = new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(amount);
  return rate ? `$${formatted}` : `INR ${formatted}`;
}

export function describeAdminRate(rate: InrUsdRate): string {
  return `Latest available FX rate: $1 = INR ${(1 / rate.usdPerInr).toFixed(2)} · ${rate.date}`;
}
