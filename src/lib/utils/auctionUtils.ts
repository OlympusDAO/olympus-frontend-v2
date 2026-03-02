import { formatTickPrice } from "./formatters";

interface NextTickInfo {
  nextPrice: string;
  timeUntilTick: string;
}

export function calculateNextTick(
  tickData: { price: bigint; capacity: bigint } | undefined,
  auctionParameters: { target: bigint; tickSize: bigint; minPrice?: bigint } | undefined,
  depositPeriodsCount: bigint | number | undefined,
  tickStep: bigint | number | undefined,
  currentTickSize?: bigint,
): NextTickInfo | null {
  if (
    !auctionParameters?.target ||
    !auctionParameters?.tickSize ||
    !depositPeriodsCount ||
    !tickStep ||
    !tickData
  ) {
    return null;
  }

  if (auctionParameters.target === 0n) {
    return null;
  }

  // Calculate next tick price: price * 10000 / tickStep
  const nextPrice = (tickData.price * 10000n) / BigInt(tickStep);

  // Check if current price is already at or below minimum price
  // If so, the price won't decrease further
  if (auctionParameters.minPrice && tickData.price <= auctionParameters.minPrice) {
    return {
      nextPrice: formatTickPrice(auctionParameters.minPrice),
      timeUntilTick: "Min Price Reached",
    };
  }

  // If next price would be below minimum, cap it at minimum (contract behavior)
  const effectiveNextPrice =
    auctionParameters.minPrice && nextPrice < auctionParameters.minPrice
      ? auctionParameters.minPrice
      : nextPrice;

  // Calculate capacity addition per second
  const capacityToAddPerSecond = auctionParameters.target / 86400n / BigInt(depositPeriodsCount);

  if (capacityToAddPerSecond === 0n) {
    return {
      nextPrice: formatTickPrice(effectiveNextPrice),
      timeUntilTick: "Paused",
    };
  }

  // Use currentTickSize if provided, otherwise fall back to auctionParameters.tickSize
  const tickSize = currentTickSize ?? auctionParameters.tickSize;
  const capacityRemaining = tickSize - tickData.capacity;
  const secondsToNextTick = capacityRemaining / capacityToAddPerSecond;

  if (secondsToNextTick <= 0n) {
    return {
      nextPrice: formatTickPrice(effectiveNextPrice),
      timeUntilTick: "Now",
    };
  }

  const hours = secondsToNextTick / 3600n;
  const minutes = (secondsToNextTick % 3600n) / 60n;

  const timeUntilTick = hours > 0n ? `${hours} hrs ${minutes} mins` : `${minutes} mins`;

  return {
    nextPrice: formatTickPrice(effectiveNextPrice),
    timeUntilTick,
  };
}

interface DailyCapacityReset {
  text: string;
  isNow: boolean;
}

export function calculateDailyCapacityReset(
  initTimestamp: bigint | number | undefined,
): DailyCapacityReset | null {
  if (!initTimestamp) return null;

  const initTime = typeof initTimestamp === "bigint" ? Number(initTimestamp) : initTimestamp;
  const now = Math.floor(Date.now() / 1000);
  const secondsSinceInit = now - initTime;
  const secondsInDay = 86400;

  // If more than 24h have passed since init, the counter hasn't been reset yet
  // Note: The actual bidding capacity continues to replenish via the tick mechanism
  // This counter will reset on the next heartbeat/parameter update
  if (secondsSinceInit >= secondsInDay) {
    return { text: "Tuning: Soon", isNow: true };
  }

  const secondsUntilReset = secondsInDay - (secondsSinceInit % secondsInDay);
  const hours = Math.floor(secondsUntilReset / 3600);
  const minutes = Math.floor((secondsUntilReset % 3600) / 60);

  return {
    text: `Tuning in ${hours}h ${minutes}m`,
    isNow: false,
  };
}
