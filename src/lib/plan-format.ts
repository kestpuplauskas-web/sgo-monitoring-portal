export function formatEur(n: number | string | null | undefined): string {
  const v = Number(n ?? 0);
  return (Number.isInteger(v) ? String(v) : v.toFixed(2).replace(".", ",")) + " €";
}

export function priceLabel(p: { price: number | string; period_label: string; old_price: number | string | null }) {
  return `${formatEur(p.price)} ${p.period_label}`.trim();
}
