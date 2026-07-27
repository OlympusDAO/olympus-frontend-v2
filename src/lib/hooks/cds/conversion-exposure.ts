export interface ConvertiblePositionExposure {
  positionId: string;
  remainingAmountDecimal: string;
  conversionPriceDecimal: string;
}

export interface RedemptionExposure {
  positionId: string;
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
    const price = positionPrices.get(redemption.positionId) || 0;

    if (hasActiveLoan && amount > 0 && price > 0) {
      totalDepositsUsd += amount;
      convertibleOhm += amount / price;
    }
  }

  return { convertibleOhm, totalDepositsUsd };
}
