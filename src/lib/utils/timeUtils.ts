export function calculateDaysUntilRedeemable(redeemableAt: number): number {
  const now = Math.floor(Date.now() / 1000);
  const diffSeconds = redeemableAt - now;
  const diffDays = Math.ceil(diffSeconds / (24 * 60 * 60));
  return Math.max(0, diffDays);
}

export function formatRedemptionStatus(redeemableAt: number): string {
  const daysLeft = calculateDaysUntilRedeemable(redeemableAt);
  
  if (daysLeft === 0) {
    return "Redeemable now";
  } else if (daysLeft === 1) {
    return "Redeemable in 1 day";
  } else {
    return `Redeemable in ${daysLeft} days`;
  }
}

export function calculateRedemptionProgress(redeemableAt: number, periodMonths: number): number {
  const now = Math.floor(Date.now() / 1000);
  
  // Convert period months to days, then to seconds
  const periodDays = periodMonths * 30; // Approximate days per month
  const periodSeconds = periodDays * 24 * 60 * 60;
  
  // Redemption started [periodDays] before redeemableAt
  const redemptionStartedAt = redeemableAt - periodSeconds;
  
  if (now >= redeemableAt) {
    return 100; // Fully complete
  }
  
  if (now <= redemptionStartedAt) {
    return 0; // Just started
  }
  
  // Calculate progress percentage
  const totalDuration = redeemableAt - redemptionStartedAt;
  const elapsed = now - redemptionStartedAt;
  const progress = (elapsed / totalDuration) * 100;
  
  return Math.min(100, Math.max(0, progress));
}