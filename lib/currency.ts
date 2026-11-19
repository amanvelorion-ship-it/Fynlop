export function formatInrPaise(amountPaise: number): string {
  if (!Number.isSafeInteger(amountPaise) || amountPaise < 0) {
    throw new Error("Collection prices must be a non-negative integer number of paise.");
  }
  const rupees = Math.floor(amountPaise / 100);
  const paise = amountPaise % 100;
  return `₹${rupees.toLocaleString("en-IN")}.${String(paise).padStart(2, "0")}`;
}

export function formatAdminMoney(amountInr: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amountInr);
}

export function formatAdminAxisMoney(amountInr: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(amountInr);
}
