import { describe, expect, it } from "vitest";
import { buildConversionLadder, unlockMovePercent } from "@/lib/hooks/cds/conversion-ladder";
import type { ConversionStrike } from "@/lib/hooks/cds/conversion-exposure";

const strike = (
  amountUsd: number,
  conversionPrice: number,
  positionId: string | null = null,
): ConversionStrike => ({ positionId, amountUsd, conversionPrice });

describe("buildConversionLadder", () => {
  it("groups claims into price buckets", () => {
    const ladder = buildConversionLadder(
      [strike(100, 20.1), strike(300, 20.2), strike(500, 20.3)],
      20,
    );

    expect(ladder.buckets).toHaveLength(2);
    expect(ladder.buckets[0]).toMatchObject({
      priceFloor: 20,
      priceCeiling: 20.25,
      amountUsd: 400,
    });
    expect(ladder.buckets[1]).toMatchObject({
      priceFloor: 20.25,
      priceCeiling: 20.5,
      amountUsd: 500,
    });
  });

  it("splits value either side of spot exactly, not by bucket", () => {
    // 19.90 is below spot, 20.10 above, and both land in buckets that straddle it.
    const ladder = buildConversionLadder([strike(600, 19.9), strike(400, 20.1)], 20);

    expect(ladder.convertibleUsd).toBe(600);
    expect(ladder.pendingUsd).toBe(400);
    expect(ladder.totalUsd).toBe(1000);
  });

  it("only marks a bucket convertible when all of it sits below spot", () => {
    const ladder = buildConversionLadder([strike(100, 19.6), strike(100, 20.1)], 20);

    // 19.50-19.75 is entirely below spot.
    expect(ladder.buckets[0].convertible).toBe(true);
    // 20.00-20.25 straddles spot, so it stays pending.
    expect(ladder.buckets[1].convertible).toBe(false);
  });

  it("counts one position once even when it contributes two claims", () => {
    const ladder = buildConversionLadder([strike(600, 20.1, "1"), strike(400, 20.2, "1")], 20);

    expect(ladder.buckets[0].positionCount).toBe(1);
    expect(ladder.buckets[0].amountUsd).toBe(1000);
  });

  it("keeps unattributed claims distinct", () => {
    const ladder = buildConversionLadder([strike(600, 20.1), strike(400, 20.2)], 20);

    expect(ladder.buckets[0].positionCount).toBe(2);
  });

  it("collapses the sparse tail into one bar once coverage is met", () => {
    const ladder = buildConversionLadder(
      [strike(9500, 20.1), strike(200, 25.1), strike(200, 30.1), strike(100, 37.1)],
      20,
      { coverage: 0.95 },
    );

    expect(ladder.buckets).toHaveLength(2);
    const overflow = ladder.buckets[1];
    expect(overflow.isOverflow).toBe(true);
    expect(overflow.amountUsd).toBe(500);
    expect(overflow.positionCount).toBe(3);
    expect(overflow.priceFloor).toBe(25);
    // Spans through the highest strike's bucket rather than one bucket width.
    expect(overflow.priceCeiling).toBe(37.25);
  });

  it("does not collapse when only one bucket would remain", () => {
    // Coverage is met at the first bucket, but collapsing a lone survivor would just
    // relabel it, so it stays a normal bar.
    const ladder = buildConversionLadder([strike(9800, 20.1), strike(200, 25.1)], 20, {
      coverage: 0.95,
    });

    expect(ladder.buckets).toHaveLength(2);
    expect(ladder.buckets[1].isOverflow).toBe(false);
    expect(ladder.buckets[1].priceCeiling).toBe(25.25);
  });

  it("reports the next tranche to unlock and the move it needs", () => {
    const ladder = buildConversionLadder([strike(100, 19.6), strike(5000, 20.4)], 20);

    expect(ladder.nextUnlockUsd).toBe(5000);
    // The 20.25-20.50 bucket clears once OHM reaches 20.50, which is +2.5%.
    expect(ladder.nextUnlockMovePercent).toBeCloseTo(2.5, 6);
  });

  it("measures the overflow bar's unlock from its first slice, not the top of the tail", () => {
    const ladder = buildConversionLadder(
      [strike(9500, 20.1), strike(200, 25.1), strike(200, 30.1), strike(100, 37.1)],
      20,
      { coverage: 0.95 },
    );

    const overflow = ladder.buckets[1];
    expect(overflow.isOverflow).toBe(true);
    // The bar spans 25.00-37.25, but its cheapest claims convert at 25.25, so the
    // move is +26.25% rather than the +86% the far edge would imply.
    expect(unlockMovePercent(overflow, 20, ladder.bucketSize)).toBeCloseTo(26.25, 6);
  });

  it("measures a normal bucket's unlock from its own ceiling", () => {
    const ladder = buildConversionLadder([strike(1000, 20.4)], 20);

    expect(unlockMovePercent(ladder.buckets[0], 20, ladder.bucketSize)).toBeCloseTo(2.5, 6);
  });

  it("reports the next unlock off the overflow bar's first slice too", () => {
    const ladder = buildConversionLadder(
      [strike(9500, 19.5), strike(200, 25.1), strike(200, 30.1), strike(100, 37.1)],
      20,
      { coverage: 0.95 },
    );

    expect(ladder.nextUnlockMovePercent).toBeCloseTo(26.25, 6);
  });

  it("returns an empty ladder rather than NaN with no strikes or no price", () => {
    expect(buildConversionLadder([], 20).buckets).toEqual([]);
    expect(buildConversionLadder([], 20).totalUsd).toBe(0);

    const noPrice = buildConversionLadder([strike(100, 20.1)], 0);
    expect(noPrice.nextUnlockMovePercent).toBe(0);
    expect(noPrice.convertibleUsd).toBe(0);
  });

  it("ignores non-positive amounts and prices", () => {
    const ladder = buildConversionLadder([strike(0, 20.1), strike(100, 0), strike(50, 20.1)], 20);

    expect(ladder.totalUsd).toBe(50);
    expect(ladder.buckets).toHaveLength(1);
  });

  it("keeps bucket edges free of float drift", () => {
    const ladder = buildConversionLadder([strike(100, 20.75), strike(100, 21)], 20);

    expect(ladder.buckets.map((b) => [b.priceFloor, b.priceCeiling])).toEqual([
      [20.75, 21],
      [21, 21.25],
    ]);
  });
});
