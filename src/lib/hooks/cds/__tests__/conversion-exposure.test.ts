import { describe, expect, it } from "vitest";
import {
  calculateConversionExposure,
  summarizeMoneyness,
  type ConversionStrike,
} from "@/lib/hooks/cds/conversion-exposure";

const position = (positionId: string, initial: string, remaining: string, price = "20") => ({
  positionId,
  initialAmountDecimal: initial,
  remainingAmountDecimal: remaining,
  conversionPriceDecimal: price,
});

const strike = (amountUsd: number, conversionPrice: number, positionId: string | null = "1") =>
  ({ positionId, amountUsd, conversionPrice }) satisfies ConversionStrike;

describe("calculateConversionExposure", () => {
  it("counts open positions at each strike", () => {
    const exposure = calculateConversionExposure({
      positions: [position("1", "1000", "1000", "20"), position("2", "500", "500", "25")],
      redemptions: [],
    });

    expect(exposure.totalDepositedUsd).toBe(1500);
    expect(exposure.grossDepositsUsd).toBe(1500);
    expect(exposure.grossConvertibleOhm).toBe(70);
    expect(exposure.positionReflectionRatio).toBe(1);
  });

  it("nets borrowed principal off the treasury figure and mints no OHM for levered deposits", () => {
    const exposure = calculateConversionExposure({
      positions: [position("1", "5000", "1000", "20")],
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
    expect(exposure.netDepositsUsd).toBe(2000);
    // Gross OHM is 50 + 200 = 250; only the 1000 nobody has drawn against still mints.
    expect(exposure.netConvertibleOhm).toBeCloseTo(50, 9);
  });

  it("nets receipt-token loan principal even though its collateral is not in the base", () => {
    const exposure = calculateConversionExposure({
      positions: [position("1", "1000", "1000", "20")],
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
    expect(exposure.netConvertibleOhm).toBe(0);
  });

  it("drops deposits that finished redeeming through the receipt token", () => {
    const exposure = calculateConversionExposure({
      positions: [position("1", "1000", "1000", "20")],
      redemptions: [
        {
          // The deposit has left the facility, but the indexer never decremented the
          // position, so remainingAmount still claims the full 1000.
          positionId: null,
          receiptTokenId: "rt-1",
          amountDecimal: "400",
          finishedEvents: { items: [{}] },
        },
      ],
    });

    expect(exposure.finishedRedemptionsUsd).toBe(400);
    expect(exposure.grossDepositsUsd).toBe(600);
    expect(exposure.positionReflectionRatio).toBeCloseTo(0.6, 9);
    // Strikes and the OHM leg are scaled so they tie back to the ledger.
    expect(exposure.strikes[0].amountUsd).toBeCloseTo(600, 9);
    expect(exposure.grossConvertibleOhm).toBeCloseTo(30, 9);
  });

  it("drops a finished position-linked redemption the indexer never decremented", () => {
    const exposure = calculateConversionExposure({
      // Position 0 keeps its full remainingAmount through a finished redemption — a
      // falsy-zero bug in the indexer that hits only the position whose id is "0".
      positions: [position("0", "20000", "20000", "20")],
      redemptions: [{ positionId: "0", amountDecimal: "20000", finishedEvents: { items: [{}] } }],
    });

    expect(exposure.grossDepositsUsd).toBe(0);
    expect(exposure.positionReflectionRatio).toBe(0);
    expect(exposure.grossConvertibleOhm).toBe(0);
  });

  it("removes converted deposits from the base", () => {
    const exposure = calculateConversionExposure({
      positions: [position("1", "1000", "1000", "20")],
      redemptions: [],
      convertedDepositsUsd: 250,
    });

    expect(exposure.grossDepositsUsd).toBe(750);
  });

  it("ignores loans left marked active on a finished or cancelled redemption", () => {
    const exposure = calculateConversionExposure({
      positions: [position("1", "1000", "1000", "20")],
      redemptions: [
        {
          positionId: null,
          amountDecimal: "3000",
          loans: { items: [{ status: "active", principalDecimal: "2901" }] },
          cancelledEvents: { items: [{}] },
        },
      ],
    });

    // The redemption was reversed, so the loan cannot still be outstanding and the
    // position came back rather than leaving.
    expect(exposure.borrowedPrincipalUsd).toBe(0);
    expect(exposure.grossDepositsUsd).toBe(1000);
    expect(exposure.netDepositsUsd).toBe(1000);
  });

  it("excludes pending redemptions without active loans", () => {
    const exposure = calculateConversionExposure({
      positions: [position("1", "1000", "1000", "20")],
      redemptions: [
        { positionId: "1", amountDecimal: "400", loans: { items: [{ status: "repaid" }] } },
        { positionId: "1", amountDecimal: "200", loans: { items: [] } },
      ],
    });

    expect(exposure.borrowedPrincipalUsd).toBe(0);
    expect(exposure.encumberedDepositsUsd).toBe(0);
    expect(exposure.grossDepositsUsd).toBe(1000);
  });

  it("ignores malformed decimals instead of leaking parseFloat partial values", () => {
    const exposure = calculateConversionExposure({
      positions: [position("1", "-392147.-104836010027065151", "-392147.-104836010027065151")],
      redemptions: [],
    });

    expect(exposure.totalDepositedUsd).toBe(0);
    expect(exposure.grossDepositsUsd).toBe(0);
    expect(exposure.grossConvertibleOhm).toBe(0);
  });

  it("floors the net figure at zero when principal exceeds the collateral", () => {
    const exposure = calculateConversionExposure({
      positions: [position("1", "1000", "0", "20")],
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
    const summary = summarizeMoneyness([strike(1000, 20, "1"), strike(500, 25, "2")], 22);

    expect(summary.inTheMoneyUsd).toBe(1000);
    expect(summary.inTheMoneyCount).toBe(1);
    expect(summary.outOfTheMoneyUsd).toBe(500);
    expect(summary.outOfTheMoneyCount).toBe(1);
    // Deposit value is 1000; the gain is only 1000 * (22/20 - 1).
    expect(summary.unrealizedGainUsd).toBeCloseTo(100, 9);
    expect(summary.weightedConversionPrice).toBeCloseTo(21.6667, 4);
    expect(summary.movePercentToAverageStrike).toBeCloseTo(-1.5152, 4);
  });

  it("counts one position once even when it contributes two strikes", () => {
    // A position can carry both a residual remainingAmount and a pending redemption.
    const summary = summarizeMoneyness([strike(600, 20, "1"), strike(400, 20, "1")], 22);

    expect(summary.totalCount).toBe(1);
    expect(summary.inTheMoneyCount).toBe(1);
    expect(summary.totalUsd).toBe(1000);
  });

  it("keeps unattributed claims distinct rather than collapsing them", () => {
    const summary = summarizeMoneyness([strike(600, 20, null), strike(400, 20, null)], 22);

    expect(summary.totalCount).toBe(2);
  });

  it("reports how far OHM has to move when every claim is underwater", () => {
    const summary = summarizeMoneyness([strike(1000, 22)], 20);

    expect(summary.inTheMoneyCount).toBe(0);
    expect(summary.outOfTheMoneyCount).toBe(1);
    expect(summary.unrealizedGainUsd).toBe(0);
    expect(summary.movePercentToAverageStrike).toBeCloseTo(10, 6);
  });

  it("treats a claim at exactly the current price as out of the money", () => {
    const summary = summarizeMoneyness([strike(1000, 20)], 20);

    expect(summary.outOfTheMoneyCount).toBe(1);
    expect(summary.unrealizedGainUsd).toBe(0);
    expect(summary.movePercentToAverageStrike).toBe(0);
  });

  it("returns zeroes rather than NaN without an OHM price", () => {
    const summary = summarizeMoneyness([strike(1000, 20)], 0);

    expect(summary.movePercentToAverageStrike).toBe(0);
    expect(summary.totalUsd).toBe(1000);
  });
});
