import type { ConversionStrike } from "./conversion-exposure";

export interface ConversionLadderBucket {
  /** Lower edge, inclusive. */
  priceFloor: number;
  /** Upper edge, exclusive. Wider than bucketSize only for the collapsed tail. */
  priceCeiling: number;
  amountUsd: number;
  positionCount: number;
  /** Every claim in the bucket is already below spot, so the whole bar can convert. */
  convertible: boolean;
  /** The single bar standing in for the sparse tail above the covered range. */
  isOverflow: boolean;
}

export interface ConversionLadder {
  buckets: ConversionLadderBucket[];
  bucketSize: number;
  ohmPrice: number;
  /** Deposit value whose strike sits below spot. Exact, not bucket-rounded. */
  convertibleUsd: number;
  /** Deposit value still waiting on a higher OHM price. */
  pendingUsd: number;
  totalUsd: number;
  /** Deposit value in the cheapest tranche not yet convertible. */
  nextUnlockUsd: number;
  /** Percent OHM has to rise to reach that tranche. 0 when there is none. */
  nextUnlockMovePercent: number;
}

export interface ConversionLadderOptions {
  bucketSize?: number;
  /**
   * Share of total value the individually-drawn buckets must cover before the rest
   * collapses into one bar. The tail here runs to $37 while holding under 4% of the
   * book, so drawing it uniformly would flatten the part that matters.
   */
  coverage?: number;
}

const DEFAULT_BUCKET_SIZE = 0.25;
const DEFAULT_COVERAGE = 0.95;

/** Floors to the bucket edge, avoiding the float drift of price/size|0 * size. */
const floorToBucket = (price: number, size: number) =>
  Math.round(Math.floor(price / size) * size * 100) / 100;

export function buildConversionLadder(
  strikes: ConversionStrike[],
  ohmPrice: number,
  { bucketSize = DEFAULT_BUCKET_SIZE, coverage = DEFAULT_COVERAGE }: ConversionLadderOptions = {},
): ConversionLadder {
  const byFloor = new Map<number, { amountUsd: number; positions: Set<string> }>();

  let totalUsd = 0;
  let convertibleUsd = 0;
  let anonymous = 0;

  for (const { positionId, amountUsd, conversionPrice } of strikes) {
    if (amountUsd <= 0 || conversionPrice <= 0) continue;

    totalUsd += amountUsd;
    if (ohmPrice > conversionPrice) convertibleUsd += amountUsd;

    const floor = floorToBucket(conversionPrice, bucketSize);
    const bucket = byFloor.get(floor) ?? { amountUsd: 0, positions: new Set<string>() };
    bucket.amountUsd += amountUsd;
    // One position can contribute a residual balance and a pending redemption.
    bucket.positions.add(positionId ?? `anonymous-${anonymous++}`);
    byFloor.set(floor, bucket);
  }

  const ordered = [...byFloor.entries()].sort((a, b) => a[0] - b[0]);
  const buckets: ConversionLadderBucket[] = [];
  const coverageTarget = totalUsd * coverage;

  let cumulative = 0;
  for (let i = 0; i < ordered.length; i++) {
    const [priceFloor, { amountUsd, positions }] = ordered[i];
    const remaining = ordered.slice(i + 1);

    // Collapse only once the drawn bars already carry `coverage`, and only when it
    // saves more than a single bar — otherwise the overflow bar IS the last bucket.
    if (cumulative >= coverageTarget && remaining.length > 0) {
      const tail = ordered.slice(i);
      const tailPositions = new Set<string>();
      let tailUsd = 0;
      for (const [, entry] of tail) {
        tailUsd += entry.amountUsd;
        for (const id of entry.positions) tailPositions.add(id);
      }

      buckets.push({
        priceFloor,
        priceCeiling: ordered[ordered.length - 1][0] + bucketSize,
        amountUsd: tailUsd,
        positionCount: tailPositions.size,
        convertible: ohmPrice >= ordered[ordered.length - 1][0] + bucketSize,
        isOverflow: true,
      });
      break;
    }

    cumulative += amountUsd;
    const priceCeiling = Math.round((priceFloor + bucketSize) * 100) / 100;

    buckets.push({
      priceFloor,
      priceCeiling,
      amountUsd,
      positionCount: positions.size,
      // Only fully-below-spot buckets read as convertible. The bucket straddling
      // spot stays pending, and the reference line shows why.
      convertible: ohmPrice >= priceCeiling,
      isOverflow: false,
    });
  }

  const nextUnlock = buckets.find((bucket) => !bucket.convertible && bucket.amountUsd > 0);

  return {
    buckets,
    bucketSize,
    ohmPrice,
    convertibleUsd,
    pendingUsd: totalUsd - convertibleUsd,
    totalUsd,
    nextUnlockUsd: nextUnlock?.amountUsd ?? 0,
    nextUnlockMovePercent: nextUnlock ? unlockMovePercent(nextUnlock, ohmPrice, bucketSize) : 0,
  };
}

/**
 * How far OHM has to rise for a bucket to start converting.
 *
 * A normal bucket clears at its ceiling. The overflow bar's ceiling is the top of
 * the whole collapsed tail, which can be many dollars away, so it clears at the top
 * of its first slice instead — otherwise a tail running to $37 reports the move as
 * +86% when the next tranche actually unlocks at +26%.
 */
export function unlockMovePercent(
  bucket: ConversionLadderBucket,
  ohmPrice: number,
  bucketSize: number,
): number {
  if (ohmPrice <= 0) return 0;

  const clearsAt = bucket.isOverflow
    ? Math.min(bucket.priceCeiling, bucket.priceFloor + bucketSize)
    : bucket.priceCeiling;

  return Math.max(0, (clearsAt / ohmPrice - 1) * 100);
}
