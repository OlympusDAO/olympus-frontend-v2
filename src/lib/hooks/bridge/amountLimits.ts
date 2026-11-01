export type AmountStatus =
  | "ok"
  | "near-limit"
  | "exceeds-route-limit"
  | "exceeds-liquidity"
  | "unverified";

/** Warn above this share of the tightest limit, since other wallets can use up the capacity. */
const NEAR_LIMIT_PERCENT = 90n;

/**
 * Checks an amount against a route's limits before signing. `null` tokens means the pool has that
 * rate limiter switched off, so there's no limit; `undefined` means it hasn't been read. Going over
 * the outbound limit reverts safely, but going over the inbound limit or the pool's liquidity
 * strands OHM after it has already left the source, so all of them block.
 */
export function evaluateAmount({
  amount,
  outboundTokens,
  inboundTokens,
  poolLiquidity,
}: {
  amount: bigint;
  outboundTokens?: bigint | null;
  inboundTokens?: bigint | null;
  /** The mainnet pool's OHM balance, null while unread. Undefined when the destination isn't mainnet. */
  poolLiquidity?: bigint | null;
}): { status: AmountStatus } {
  if (amount <= 0n) return { status: "ok" };

  if (outboundTokens === undefined || inboundTokens === undefined) {
    return { status: "exceeds-route-limit" };
  }
  if (
    (outboundTokens !== null && amount > outboundTokens) ||
    (inboundTokens !== null && amount > inboundTokens)
  ) {
    return { status: "exceeds-route-limit" };
  }
  if (poolLiquidity === null) return { status: "unverified" };
  if (poolLiquidity !== undefined && amount > poolLiquidity) {
    return { status: "exceeds-liquidity" };
  }

  const limits = [outboundTokens, inboundTokens, poolLiquidity].filter(
    (limit): limit is bigint => limit !== null && limit !== undefined,
  );
  const isNearLimit = limits.some((limit) => amount * 100n > limit * NEAR_LIMIT_PERCENT);
  return { status: isNearLimit ? "near-limit" : "ok" };
}
