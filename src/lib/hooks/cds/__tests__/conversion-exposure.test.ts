import { describe, expect, it } from "vitest";
import {
  calculateConversionExposure,
  summarizeMoneyness,
} from "@/lib/hooks/cds/conversion-exposure";

describe("calculateConversionExposure", () => {
  it("includes open and active redeemed CD exposure at each position strike", () => {
    const exposure = calculateConversionExposure({
      positions: [
        {
          positionId: "1",
          remainingAmountDecimal: "1000",
          conversionPriceDecimal: "20",
        },
        {
          positionId: "2",
          remainingAmountDecimal: "500",
          conversionPriceDecimal: "25",
        },
      ],
      redemptions: [
        {
          positionId: "1",
          amountDecimal: "4000",
          loans: { items: [{ status: "active", principalDecimal: "3000" }] },
        },
      ],
    });

    expect(exposure.grossDepositsUsd).toBe(5500);
    expect(exposure.grossConvertibleOhm).toBe(270);
  });

  it("nets borrowed principal off the treasury figure and mints no OHM for levered deposits", () => {
    const exposure = calculateConversionExposure({
      positions: [
        {
          positionId: "1",
          remainingAmountDecimal: "1000",
          conversionPriceDecimal: "20",
        },
      ],
      redemptions: [
        {
          positionId: "1",
          amountDecimal: "4000",
          loans: { items: [{ status: "active", principalDecimal: "3000" }] },
        },
      ],
    });

    expect(exposure.leveredDepositsUsd).toBe(4000);
    expect(exposure.borrowedPrincipalUsd).toBe(3000);
    expect(exposure.encumberedDepositsUsd).toBe(4000);
    // 5000 base - 3000 borrowed: the borrowed cash is routinely redeposited as a new
    // position, so counting it gross double-counts the same capital.
    expect(exposure.netDepositsUsd).toBe(2000);
    // Gross OHM is 50 + 200 = 250; only the 1000 nobody has drawn against still
    // mints, so a fifth of it.
    expect(exposure.netConvertibleOhm).toBeCloseTo(50, 9);
  });

  it("nets receipt-token loan principal even though its collateral is not in the base", () => {
    const exposure = calculateConversionExposure({
      positions: [
        {
          positionId: "1",
          remainingAmountDecimal: "1000",
          conversionPriceDecimal: "20",
        },
      ],
      redemptions: [
        {
          // The position above still shows its full remainingAmount, so the deposit is
          // already counted once. Only the cash lent against it needs netting.
          positionId: null,
          receiptTokenId: "rt-1",
          amountDecimal: "1000",
          loans: { items: [{ status: "active", principalDecimal: "967" }] },
        },
      ],
    });

    expect(exposure.grossDepositsUsd).toBe(1000);
    expect(exposure.leveredDepositsUsd).toBe(0);
    expect(exposure.borrowedPrincipalUsd).toBe(967);
    expect(exposure.netDepositsUsd).toBe(33);
    // The whole 1000 is spoken for by the receipt-token redemption, so nothing
    // unencumbered is left to mint OHM.
    expect(exposure.encumberedDepositsUsd).toBe(1000);
    expect(exposure.netConvertibleOhm).toBe(0);
  });

  it("ignores loans left marked active on a finished or cancelled redemption", () => {
    const exposure = calculateConversionExposure({
      positions: [
        {
          positionId: "1",
          remainingAmountDecimal: "1000",
          conversionPriceDecimal: "20",
        },
      ],
      redemptions: [
        {
          positionId: null,
          amountDecimal: "5000",
          loans: { items: [{ status: "active", principalDecimal: "4835" }] },
          finishedEvents: { items: [{}] },
        },
        {
          positionId: null,
          amountDecimal: "3000",
          loans: { items: [{ status: "active", principalDecimal: "2901" }] },
          cancelledEvents: { items: [{}] },
        },
      ],
    });

    // The redemption completed or was reversed, so the loan cannot still be out.
    expect(exposure.borrowedPrincipalUsd).toBe(0);
    expect(exposure.netDepositsUsd).toBe(1000);
  });

  it("excludes redeemed positions without active loans", () => {
    const exposure = calculateConversionExposure({
      positions: [
        {
          positionId: "1",
          remainingAmountDecimal: "1000",
          conversionPriceDecimal: "20",
        },
      ],
      redemptions: [
        {
          positionId: "1",
          amountDecimal: "4000",
          loans: { items: [{ status: "repaid", principalDecimal: "3000" }] },
        },
        {
          positionId: "1",
          amountDecimal: "2000",
          loans: { items: [] },
        },
      ],
    });

    expect(exposure.grossDepositsUsd).toBe(1000);
    expect(exposure.grossConvertibleOhm).toBe(50);
    expect(exposure.borrowedPrincipalUsd).toBe(0);
  });

  it("ignores malformed decimals instead of leaking parseFloat partial values", () => {
    const exposure = calculateConversionExposure({
      positions: [
        {
          positionId: "1",
          remainingAmountDecimal: "-392147.-104836010027065151",
          conversionPriceDecimal: "20",
        },
      ],
      redemptions: [],
    });

    expect(exposure.grossDepositsUsd).toBe(0);
    expect(exposure.grossConvertibleOhm).toBe(0);
  });

  it("floors the net figure at zero when principal exceeds the collateral", () => {
    const exposure = calculateConversionExposure({
      positions: [],
      redemptions: [
        {
          positionId: "1",
          amountDecimal: "1000",
          loans: { items: [{ status: "active", principalDecimal: "5000" }] },
        },
      ],
    });

    expect(exposure.netDepositsUsd).toBe(0);
  });
});

describe("summarizeMoneyness", () => {
  it("splits claims by deposit value either side of spot, and gain separately", () => {
    const summary = summarizeMoneyness(
      [
        { amountUsd: 1000, conversionPrice: 20 },
        { amountUsd: 500, conversionPrice: 25 },
      ],
      22,
    );

    expect(summary.inTheMoneyUsd).toBe(1000);
    expect(summary.inTheMoneyCount).toBe(1);
    expect(summary.outOfTheMoneyUsd).toBe(500);
    expect(summary.outOfTheMoneyCount).toBe(1);
    // Deposit value is 1000; the gain is only 1000 * (22/20 - 1).
    expect(summary.unrealizedGainUsd).toBeCloseTo(100, 9);
    // (1000*20 + 500*25) / 1500
    expect(summary.weightedConversionPrice).toBeCloseTo(21.6667, 4);
    expect(summary.breakevenMovePercent).toBeCloseTo(-1.5152, 4);
  });

  it("reports how far OHM has to move when every claim is underwater", () => {
    const summary = summarizeMoneyness([{ amountUsd: 1000, conversionPrice: 22 }], 20);

    expect(summary.inTheMoneyCount).toBe(0);
    expect(summary.outOfTheMoneyCount).toBe(1);
    expect(summary.unrealizedGainUsd).toBe(0);
    expect(summary.breakevenMovePercent).toBeCloseTo(10, 6);
  });

  it("treats a claim at exactly the current price as underwater", () => {
    const summary = summarizeMoneyness([{ amountUsd: 1000, conversionPrice: 20 }], 20);

    expect(summary.outOfTheMoneyCount).toBe(1);
    expect(summary.unrealizedGainUsd).toBe(0);
    expect(summary.breakevenMovePercent).toBe(0);
  });

  it("returns zeroes rather than NaN without an OHM price", () => {
    const summary = summarizeMoneyness([{ amountUsd: 1000, conversionPrice: 20 }], 0);

    expect(summary.breakevenMovePercent).toBe(0);
    expect(summary.totalUsd).toBe(1000);
  });
});
