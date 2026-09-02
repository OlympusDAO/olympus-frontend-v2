import { describe, expect, it } from "vitest";
import { summarizeConversions } from "@/lib/hooks/cds/cd-conversions";

const DAY = 24 * 60 * 60;
// 2026-01-03T00:00:00Z
const JAN_3 = Math.floor(Date.UTC(2026, 0, 3) / 1000);

describe("summarizeConversions", () => {
  it("returns an empty series with no conversions", () => {
    const summary = summarizeConversions([]);

    expect(summary.dataPoints).toEqual([]);
    expect(summary.totalConverted).toBe(0);
    expect(summary.totalOhmMinted).toBe(0);
    expect(summary.conversionCount).toBe(0);
    expect(summary.averageRealisedPrice).toBe(0);
  });

  it("buckets same-day conversions together and runs a cumulative total", () => {
    const summary = summarizeConversions([
      { timestamp: JAN_3 + 3600, depositAmountDecimal: "100", convertedAmountDecimal: "5" },
      { timestamp: JAN_3 + 7200, depositAmountDecimal: "300", convertedAmountDecimal: "15" },
      { timestamp: JAN_3 + DAY, depositAmountDecimal: "600", convertedAmountDecimal: "30" },
    ]);

    expect(summary.dataPoints).toHaveLength(2);
    expect(summary.dataPoints[0].dailyConverted).toBe(400);
    expect(summary.dataPoints[0].cumulativeConverted).toBe(400);
    expect(summary.dataPoints[1].cumulativeConverted).toBe(1000);
    expect(summary.dataPoints[1].cumulativeOhmMinted).toBe(50);
    expect(summary.conversionCount).toBe(3);
  });

  it("sorts out-of-order events before accumulating", () => {
    const summary = summarizeConversions([
      { timestamp: JAN_3 + DAY, depositAmountDecimal: "600", convertedAmountDecimal: "30" },
      { timestamp: JAN_3, depositAmountDecimal: "400", convertedAmountDecimal: "20" },
    ]);

    expect(summary.dataPoints[0].cumulativeConverted).toBe(400);
    expect(summary.dataPoints[1].cumulativeConverted).toBe(1000);
  });

  it("carries the running total into a window that opens later", () => {
    const summary = summarizeConversions(
      [
        { timestamp: JAN_3, depositAmountDecimal: "400", convertedAmountDecimal: "20" },
        { timestamp: JAN_3 + 5 * DAY, depositAmountDecimal: "600", convertedAmountDecimal: "30" },
      ],
      JAN_3 + 3 * DAY,
    );

    // The earlier conversion is outside the window but still counts toward the total,
    // so the line does not restart from zero.
    expect(summary.dataPoints).toHaveLength(1);
    expect(summary.dataPoints[0].cumulativeConverted).toBe(1000);
    expect(summary.totalConverted).toBe(1000);
  });

  it("reports the realised conversion price", () => {
    const summary = summarizeConversions([
      { timestamp: JAN_3, depositAmountDecimal: "250.40", convertedAmountDecimal: "9.60" },
    ]);

    expect(summary.averageRealisedPrice).toBeCloseTo(26.0833, 4);
  });

  it("ignores malformed decimals from the indexer", () => {
    const summary = summarizeConversions([
      {
        timestamp: JAN_3,
        depositAmountDecimal: "-392147.-104836010027065151",
        convertedAmountDecimal: "-1.-5",
      },
    ]);

    expect(summary.conversionCount).toBe(0);
    expect(summary.totalConverted).toBe(0);
  });
});
