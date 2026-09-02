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
      { id: "1_vaultA_alice_5", positionId: "10", amountDecimal: "100" },
      { id: "1_vaultA_bob_5", positionId: "11", amountDecimal: "200" },
    ],
    // Same redemptionId (5) as both redemptions above, but it belongs to alice.
    loans: [{ id: "1_vaultA_alice_5", status: "active" }],
  };

  test("a loan attaches only to its own redemption", () => {
    const [alice, bob] = toRedemptionExposure(payload);
    expect(alice.loans?.items).toEqual([{ status: "active" }]);
    expect(bob.loans?.items).toEqual([]);
  });

  test("only the redemption with an active loan counts toward exposure", () => {
    const positions = [
      { positionId: "10", remainingAmountDecimal: "0", conversionPriceDecimal: "2" },
      { positionId: "11", remainingAmountDecimal: "0", conversionPriceDecimal: "2" },
    ];
    const exposure = calculateConversionExposure(positions, toRedemptionExposure(payload));
    // Alice only: 100 USD at a price of 2 = 50 OHM. Joining on redemptionId
    // would have added bob's 200 as well.
    expect(exposure.totalDepositsUsd).toBe(100);
    expect(exposure.convertibleOhm).toBe(50);
  });

  test("a redemption with no loan carries an empty list, not undefined", () => {
    const [, bob] = toRedemptionExposure(payload);
    expect(Array.isArray(bob.loans?.items)).toBe(true);
  });
});
