import { describe, expect, test } from "vitest";
import { calculateConversionExposure } from "@/lib/hooks/cds/conversion-exposure";
import { toRedemptionExposure } from "@/lib/hooks/cds/redemption-exposure";

// The join key is the composite `id`, not `redemptionId`. On mainnet 156
// redemptions carry only 80 distinct `redemptionId` values because it is scoped
// per depositor and vault, so joining on it attaches one depositor's loan to
// another's redemption. That inflated convertible OHM by ~9% while every row
// count still matched.
describe("joining loans onto redemptions", () => {
  const payload = {
    redemptions: [
      { id: "1_vaultA_alice_5", positionId: "10", amountDecimal: "100", status: "pending" },
      { id: "1_vaultA_bob_5", positionId: "11", amountDecimal: "200", status: "pending" },
    ],
    // Same redemptionId (5) as both redemptions above, but it belongs to alice.
    loans: [{ id: "1_vaultA_alice_5", status: "active", principalDecimal: "60" }],
  };

  test("a loan attaches only to its own redemption", () => {
    const [alice, bob] = toRedemptionExposure(payload);
    expect(alice.loans?.items).toEqual([{ status: "active", principalDecimal: "60" }]);
    expect(bob.loans?.items).toEqual([]);
  });

  test("only the redemption with an active loan counts toward exposure", () => {
    const positions = [
      {
        positionId: "10",
        receiptTokenId: "rt-1",
        initialAmountDecimal: "100",
        remainingAmountDecimal: "100",
        conversionPriceDecimal: "2",
      },
      {
        positionId: "11",
        receiptTokenId: "rt-1",
        initialAmountDecimal: "200",
        remainingAmountDecimal: "200",
        conversionPriceDecimal: "2",
      },
    ];

    const exposure = calculateConversionExposure({
      positions,
      redemptions: toRedemptionExposure(payload),
    });

    // Alice's loan only. Joining on redemptionId would have attached it to
    // bob's redemption as well and doubled both figures.
    expect(exposure.borrowedPrincipalUsd).toBe(60);
    expect(exposure.leveredDepositsUsd).toBe(100);
  });

  test("a redemption with no loan carries an empty list, not undefined", () => {
    const [, bob] = toRedemptionExposure(payload);
    expect(Array.isArray(bob.loans?.items)).toBe(true);
  });
});
