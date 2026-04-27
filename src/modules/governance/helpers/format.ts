const compactFormatter = new Intl.NumberFormat(undefined, {
  notation: "compact",
  maximumFractionDigits: 1,
});

export function abbreviateNumber(num: number): string {
  return compactFormatter.format(num);
}
