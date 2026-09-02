export interface ConvertiblePositionExposure {
  positionId: string;
  remainingAmountDecimal: string;
  // Nullable in the indexer schema, so the generated position type declares it
  // optional. Never null across the 270 live positions, but `parseDecimal`
  // already returns 0 for a missing value and a price of 0 is skipped below.
  conversionPriceDecimal?: string;
}

export interface RedemptionExposure {
  // Nullable on the wire: it comes from an on-chain read that returns empty for
  // a redemption with no linked position, and 92 of 156 live redemptions have
  // none. Those cannot be priced, so they are skipped below — which is what the
  // legacy Ponder-backed numbers did too.
  positionId?: string;
  amountDecimal: string;
  loans?: {
    items?: {
      status: string;
    }[];
  };
}

export interface ConversionExposure {
  convertibleOhm: number;
  totalDepositsUsd: number;
}

const parseDecimal = (value: string | undefined): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export function calculateConversionExposure(
  positions: ConvertiblePositionExposure[],
  redemptions: RedemptionExposure[],
): ConversionExposure {
  const positionPrices = new Map<string, number>();
  let convertibleOhm = 0;
  let totalDepositsUsd = 0;

  for (const position of positions) {
    const price = parseDecimal(position.conversionPriceDecimal);
    const remaining = parseDecimal(position.remainingAmountDecimal);

    if (price > 0) {
      positionPrices.set(position.positionId, price);
    }

    if (remaining > 0 && price > 0) {
      totalDepositsUsd += remaining;
      convertibleOhm += remaining / price;
    }
  }

  for (const redemption of redemptions) {
    const hasActiveLoan = redemption.loans?.items?.some((loan) => loan.status === "active");
    const amount = parseDecimal(redemption.amountDecimal);
    const price = redemption.positionId ? (positionPrices.get(redemption.positionId) ?? 0) : 0;

    if (hasActiveLoan && amount > 0 && price > 0) {
      totalDepositsUsd += amount;
      convertibleOhm += amount / price;
    }
  }

  return { convertibleOhm, totalDepositsUsd };
}
