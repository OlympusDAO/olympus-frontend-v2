import { describe, expect, it } from "vitest";
import { calculateConversionExposure } from "@/lib/hooks/cds/conversion-exposure";

describe("calculateConversionExposure", () => {
  it("includes open and active redeemed CD exposure at each position strike", () => {
    const exposure = calculateConversionExposure(
      [
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
      [
        {
          positionId: "1",
          amountDecimal: "4000",
          loans: { items: [{ status: "active" }] },
        },
      ],
    );

    expect(exposure.totalDepositsUsd).toBe(5500);
    expect(exposure.convertibleOhm).toBe(270);
  });

  it("excludes redeemed positions without active loans", () => {
    const exposure = calculateConversionExposure(
      [
        {
          positionId: "1",
          remainingAmountDecimal: "1000",
          conversionPriceDecimal: "20",
        },
      ],
      [
        {
          positionId: "1",
          amountDecimal: "4000",
          loans: { items: [{ status: "repaid" }] },
        },
        {
          positionId: "1",
          amountDecimal: "2000",
          loans: { items: [] },
        },
      ],
    );

    expect(exposure.totalDepositsUsd).toBe(1000);
    expect(exposure.convertibleOhm).toBe(50);
  });

  it("ignores malformed decimals instead of leaking parseFloat partial values", () => {
    const exposure = calculateConversionExposure(
      [
        {
          positionId: "1",
          remainingAmountDecimal: "-392147.-104836010027065151",
          conversionPriceDecimal: "20",
        },
      ],
      [],
    );

    expect(exposure.totalDepositsUsd).toBe(0);
    expect(exposure.convertibleOhm).toBe(0);
  });
});
