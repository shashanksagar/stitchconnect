export function money(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: cents % 100 ? 2 : 0 }).format(cents / 100);
}
export function economics(total: number, percent = 10) {
  if (!Number.isSafeInteger(total) || total < 1 || total > 100_000_000 || !Number.isInteger(percent) || percent < 0 || percent > 100) throw new Error("Invalid price or fee.");
  const fee = Math.round(total * percent / 100);
  const upfront = Math.ceil(total / 2);
  return { fee, net: total - fee, upfront, final: total - upfront };
}
