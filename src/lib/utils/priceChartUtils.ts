/**
 * Price chart utilities for visualizing tick-level auction data.
 *
 * Key concepts:
 * - Each "tick" has a starting price that can decay to a lower price when capacity fills
 * - Decay formula: nextPrice = currentPrice * 10000 / tickStep
 * - Bids occur at specific prices within a tick's potential range
 * - Min price can change when auction parameters are updated
 */

export interface TickDataPoint {
  timestamp: number;
  // The tick's current price
  tickPrice: number;
  // The price the tick can decay to (next tick price)
  decayPrice: number;
  // Min price at this point in time (optional, undefined if zero or not available)
  minPrice?: number;
  // Bid price if a bid occurred at this tick (optional)
  bidPrice?: number;
}

/**
 * Calculate the decay price for a given tick price.
 * This is the price the tick will decay to when capacity fills.
 */
export function calculateDecayPrice(
  tickPrice: bigint,
  tickStep: bigint | number,
  minPrice: bigint,
): bigint {
  const decayed = (tickPrice * 10000n) / BigInt(tickStep);
  // Clamp to minimum price
  return decayed < minPrice ? minPrice : decayed;
}

/**
 * Process historical snapshot data into tick-level chart data.
 * Uses auctioneerDepositPeriodSnapshots as the primary source of truth for tick prices.
 * Bids are overlaid as scatter points.
 */
export function processHistoricalData(
  depositPeriodSnapshots: Array<{
    timestamp: number;
    currentTickPrice: string;
    currentTickPriceDecimal: number;
  }>,
  bids: Array<{
    timestamp: number;
    tickPrice: string;
    tickPriceDecimal: number;
    tickCapacity: string;
  }>,
  auctionSnapshots: Array<{
    timestamp: number;
    minPrice: string;
    minPriceDecimal: string;
    tickSize: string;
  }>,
  tickStep: bigint | number,
): TickDataPoint[] {
  const dataPoints: TickDataPoint[] = [];

  // Helper to get min price at a given timestamp (returns undefined if not found or zero)
  const getMinPriceAtTime = (ts: number): number | undefined => {
    // Find the most recent auction snapshot before or at this timestamp
    const relevantSnapshots = auctionSnapshots
      .filter((s) => s.timestamp <= ts)
      .sort((a, b) => b.timestamp - a.timestamp);

    if (relevantSnapshots.length > 0) {
      const minPrice = Number(relevantSnapshots[0].minPriceDecimal);
      return minPrice > 0 ? minPrice : undefined;
    }
    // Fallback to first if none found before
    if (auctionSnapshots.length > 0) {
      // Sort ascending and get earliest
      const sorted = [...auctionSnapshots].sort((a, b) => a.timestamp - b.timestamp);
      const minPrice = Number(sorted[0].minPriceDecimal);
      return minPrice > 0 ? minPrice : undefined;
    }
    return undefined;
  };

  // Process deposit period snapshots - this is the source of truth for tick prices
  depositPeriodSnapshots.forEach((snap) => {
    const ts = snap.timestamp * 1000;
    const tickPrice = snap.currentTickPriceDecimal;

    // Skip if tick price is zero or invalid
    if (!tickPrice || tickPrice <= 0) return;

    const minPrice = getMinPriceAtTime(snap.timestamp);

    // Calculate decay price for this tick
    const tickPriceBigInt = BigInt(snap.currentTickPrice);
    const minPriceBigInt = minPrice ? BigInt(Math.floor(minPrice * 1e18)) : 0n;
    const decayPriceBigInt = calculateDecayPrice(tickPriceBigInt, tickStep, minPriceBigInt);
    const decayPrice = Number(decayPriceBigInt) / 1e18;

    const point: TickDataPoint = {
      timestamp: ts,
      tickPrice,
      decayPrice,
    };

    // Only add minPrice if it's a valid positive number
    if (minPrice && minPrice > 0) {
      point.minPrice = minPrice;
    }

    dataPoints.push(point);
  });

  // Create a map for quick lookup of existing timestamps
  const timestampMap = new Map<number, TickDataPoint>();
  dataPoints.forEach((point) => {
    timestampMap.set(point.timestamp, point);
  });

  // Process bids - add bidPrice to existing points or create new ones
  bids.forEach((bid) => {
    const ts = bid.timestamp * 1000;
    const bidPrice = bid.tickPriceDecimal;

    // Skip if bid price is zero or invalid
    if (!bidPrice || bidPrice <= 0) return;

    const existing = timestampMap.get(ts);
    if (existing) {
      // Add bid price to existing data point
      existing.bidPrice = bidPrice;
    } else {
      // Create a new point for the bid
      const minPrice = getMinPriceAtTime(bid.timestamp);
      const tickPriceBigInt = BigInt(bid.tickPrice);
      const minPriceBigInt = minPrice ? BigInt(Math.floor(minPrice * 1e18)) : 0n;
      const decayPriceBigInt = calculateDecayPrice(tickPriceBigInt, tickStep, minPriceBigInt);
      const decayPrice = Number(decayPriceBigInt) / 1e18;

      const newPoint: TickDataPoint = {
        timestamp: ts,
        tickPrice: bidPrice, // Use bid price as tick price when no snapshot
        decayPrice,
        bidPrice,
      };

      // Only add minPrice if it's a valid positive number
      if (minPrice && minPrice > 0) {
        newPoint.minPrice = minPrice;
      }

      dataPoints.push(newPoint);
      timestampMap.set(ts, newPoint);
    }
  });

  // Sort by timestamp
  return dataPoints.sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Chart data point interface for Recharts.
 */
export interface ChartDataPoint {
  timestamp: number;
  // Historical tick data
  tickPrice?: number;
  decayPrice?: number;
  minPrice?: number;
  bidPrice?: number;
  // Price range for area fill [decayPrice, tickPrice]
  priceRange?: [number, number];
}

// Dec 1, 2025 00:00:00 UTC in milliseconds
const DEC_1_2025_UTC = Date.UTC(2025, 11, 1, 0, 0, 0);

/**
 * Convert historical tick data to chart data points.
 * Filters out data points before the first bid after Dec 1, 2025.
 */
export function toChartData(historical: TickDataPoint[]): ChartDataPoint[] {
  // Find the first bid on or after Dec 1, 2025
  const firstBidAfterDec1 = historical.find(
    (point) => point.bidPrice !== undefined && point.timestamp >= DEC_1_2025_UTC,
  );

  // If no bids found after Dec 1, return empty array
  if (!firstBidAfterDec1) return [];

  // Use the first bid's timestamp as the minimum filter
  const minTimestamp = firstBidAfterDec1.timestamp;

  return historical
    .filter((point) => point.timestamp >= minTimestamp)
    .map((point) => {
      const chartPoint: ChartDataPoint = {
        timestamp: point.timestamp,
        tickPrice: point.tickPrice,
        decayPrice: point.decayPrice,
        minPrice: point.minPrice,
        bidPrice: point.bidPrice,
      };

      // Add price range for area fill if both values exist
      if (point.tickPrice && point.decayPrice) {
        chartPoint.priceRange = [point.decayPrice, point.tickPrice];
      }

      return chartPoint;
    });
}
