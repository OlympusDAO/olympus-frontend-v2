export interface ConversionEvent {
  timestamp: number;
  depositAmountDecimal: string;
  convertedAmountDecimal: string;
}

export interface ConversionDataPoint {
  timestamp: number;
  /** Running total of deposits converted into the treasury, up to and including this day. */
  cumulativeConverted: number;
  /** Running total of OHM minted. */
  cumulativeOhmMinted: number;
  /** Just this day's converted deposits, for the tooltip. */
  dailyConverted: number;
}

export interface ConversionSummary {
  dataPoints: ConversionDataPoint[];
  totalConverted: number;
  totalOhmMinted: number;
  conversionCount: number;
}

const parseDecimal = (value: string | null | undefined): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const startOfUtcDay = (timestampSeconds: number): number => {
  const date = new Date(timestampSeconds * 1000);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
};

/**
 * Buckets conversions into UTC days and runs a cumulative total across them.
 *
 * The running total is built from every conversion, then filtered to the window, so a
 * window that opens after earlier conversions still starts from the true total rather
 * than resetting to zero.
 */
export function summarizeConversions(
  events: ConversionEvent[],
  windowStartSeconds = 0,
): ConversionSummary {
  const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp);

  const daily = new Map<number, { converted: number; ohm: number }>();
  let totalConverted = 0;
  let totalOhmMinted = 0;
  let conversionCount = 0;

  for (const event of sorted) {
    const converted = parseDecimal(event.depositAmountDecimal);
    const ohm = parseDecimal(event.convertedAmountDecimal);
    if (converted <= 0 && ohm <= 0) continue;

    conversionCount += 1;
    totalConverted += converted;
    totalOhmMinted += ohm;

    const day = startOfUtcDay(event.timestamp);
    const bucket = daily.get(day) ?? { converted: 0, ohm: 0 };
    bucket.converted += converted;
    bucket.ohm += ohm;
    daily.set(day, bucket);
  }

  const windowStartMs = windowStartSeconds * 1000;
  let cumulativeConverted = 0;
  let cumulativeOhmMinted = 0;
  const dataPoints: ConversionDataPoint[] = [];

  for (const [day, bucket] of Array.from(daily.entries()).sort((a, b) => a[0] - b[0])) {
    cumulativeConverted += bucket.converted;
    cumulativeOhmMinted += bucket.ohm;

    if (day >= windowStartMs) {
      dataPoints.push({
        timestamp: day,
        cumulativeConverted,
        cumulativeOhmMinted,
        dailyConverted: bucket.converted,
      });
    }
  }

  return {
    dataPoints,
    totalConverted,
    totalOhmMinted,
    conversionCount,
  };
}
