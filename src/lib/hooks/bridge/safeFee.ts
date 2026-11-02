import { mainnet } from "@/lib/chains";

/**
 * A Safe's fee is quoted at proposal but paid at execution, possibly days later, and the bridge
 * reverts below the fee and keeps anything above it. So a Safe pays a disclosed buffer, sized from 21
 * days of router fee history (late 2026): lanes to L2s rose at most 8% within 7 days, while
 * Arbitrum to Ethereum, which follows L1 gas, rose 31% at the median and 221% at p95 within a day.
 */
const BUFFER_BPS = 2_500n;
const BUFFER_BPS_INTO_MAINNET = 30_000n;
const BPS = 10_000n;

export function getSafeFee(
  quote: bigint,
  destinationChainId: number,
): { value: bigint; maxOverpay: bigint } {
  const bps = destinationChainId === mainnet.id ? BUFFER_BPS_INTO_MAINNET : BUFFER_BPS;
  const maxOverpay = (quote * bps) / BPS;
  return { value: quote + maxOverpay, maxOverpay };
}
