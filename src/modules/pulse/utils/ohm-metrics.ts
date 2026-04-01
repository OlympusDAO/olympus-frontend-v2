export function calcOhmPremiumPct(ohmPrice: number, backing: number): number {
  return backing > 0 ? ((ohmPrice - backing) / backing) * 100 : 0;
}
