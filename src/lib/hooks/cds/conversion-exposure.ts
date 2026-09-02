export interface ConvertiblePositionExposure {
  positionId: string;
  remainingAmountDecimal: string;
  conversionPriceDecimal: string;
}

export interface RedemptionLoanExposure {
  status: string;
  principalDecimal?: string;
}

export interface RedemptionExposure {
  positionId?: string | null;
  receiptTokenId?: string | null;
  amountDecimal: string;
  loans?: {
    items?: RedemptionLoanExposure[];
  };
  /** Present once the redemption completed and the deposit left the protocol. */
  finishedEvents?: { items?: unknown[] };
  /** Present once the redemption was reversed and the position came back. */
  cancelledEvents?: { items?: unknown[] };
}

/** One convertible claim on the treasury: USD in, at the price it converts at. */
export interface ConversionStrike {
  amountUsd: number;
  conversionPrice: number;
}

export interface ConversionExposure {
  /**
   * Every outstanding deposit converts. Levered positions can only do that if their
   * borrower repays the loan out of outside capital, so this is the ceiling, not the
   * expected case.
   */
  grossDepositsUsd: number;
  grossConvertibleOhm: number;
  /** The levered leg of the gross figure: deposits sitting behind an active loan. */
  leveredDepositsUsd: number;
  /**
   * Principal already paid out of the vault against pending redemptions — through
   * both the position and the receipt-token route. Receipt-token redemptions leave
   * the position's remainingAmount intact, so their collateral is already counted
   * once via the position; only their loan needs netting off.
   */
  borrowedPrincipalUsd: number;
  /** Deposit value locked behind a pending redemption that has drawn a loan. */
  encumberedDepositsUsd: number;
  /**
   * Leverage unwinds: loans default, the treasury keeps the collateral net of the
   * principal it already paid out, and only unencumbered deposits mint OHM.
   * Decomposes exactly as (base - encumbered) + (encumbered - principal).
   */
  netDepositsUsd: number;
  /**
   * OHM minted in that scenario. Receipt-token redemptions cannot be traced to
   * individual strikes, so the unencumbered share is applied to the book's overall
   * OHM-per-dollar rather than to specific positions — an aggregate approximation.
   */
  netConvertibleOhm: number;
  /** Per-claim strikes, for moneyness. Covers the same deposits as the gross figure. */
  strikes: ConversionStrike[];
}

export interface ConversionExposureInput {
  positions: ConvertiblePositionExposure[];
  redemptions: RedemptionExposure[];
}

export interface MoneynessSummary {
  /** Deposit value of claims whose strike sits below spot. Deposit value, not gain. */
  inTheMoneyUsd: number;
  inTheMoneyCount: number;
  /**
   * Deposit value of claims whose strike sits above spot. Not a loss: these are
   * redeemed rather than converted, so the option simply goes unexercised.
   */
  outOfTheMoneyUsd: number;
  outOfTheMoneyCount: number;
  totalUsd: number;
  totalCount: number;
  /** What holders of in-the-money claims would gain by converting at spot. */
  unrealizedGainUsd: number;
  /** Amount-weighted conversion price across every outstanding claim. */
  weightedConversionPrice: number;
  /** Percent OHM has to move for the average claim to break even. */
  breakevenMovePercent: number;
}

/**
 * `Number` rather than `parseFloat`: the indexer emits malformed negative decimals
 * (e.g. "-302475.-729379175798898337") that parseFloat happily truncates to a
 * plausible-looking number.
 */
const parseDecimal = (value: string | null | undefined): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const isActive = (loan: RedemptionLoanExposure) => loan.status === "active";

/**
 * A redemption still in flight — neither completed nor reversed. Loans keep a stale
 * "active" status after their redemption finishes, so the lifecycle, not the loan
 * status, decides what is really outstanding.
 */
const isPending = (redemption: RedemptionExposure) =>
  (redemption.finishedEvents?.items?.length ?? 0) === 0 &&
  (redemption.cancelledEvents?.items?.length ?? 0) === 0;

export function calculateConversionExposure({
  positions,
  redemptions,
}: ConversionExposureInput): ConversionExposure {
  const positionPrices = new Map<string, number>();
  const strikes: ConversionStrike[] = [];

  let openDepositsUsd = 0;
  let openConvertibleOhm = 0;

  for (const position of positions) {
    const price = parseDecimal(position.conversionPriceDecimal);
    const remaining = parseDecimal(position.remainingAmountDecimal);

    if (price > 0) {
      positionPrices.set(position.positionId, price);
    }

    if (remaining > 0 && price > 0) {
      openDepositsUsd += remaining;
      openConvertibleOhm += remaining / price;
      strikes.push({ amountUsd: remaining, conversionPrice: price });
    }
  }

  let leveredDepositsUsd = 0;
  let leveredConvertibleOhm = 0;
  let borrowedPrincipalUsd = 0;
  let encumberedDepositsUsd = 0;

  for (const redemption of redemptions) {
    // A finished redemption already left the protocol; a cancelled one handed the
    // position back, where it is counted via remainingAmount.
    if (!isPending(redemption)) continue;

    const activeLoans = (redemption.loans?.items ?? []).filter(isActive);
    if (activeLoans.length === 0) continue;

    const amount = parseDecimal(redemption.amountDecimal);
    if (amount <= 0) continue;

    // Every dollar lent out is netted, whichever route collateralised it, and the
    // deposit behind it is spoken for either way.
    encumberedDepositsUsd += amount;
    for (const loan of activeLoans) {
      borrowedPrincipalUsd += parseDecimal(loan.principalDecimal);
    }

    // ...but only a redemption started against a specific position adds to the base.
    // A redemption taken through the fungible receipt token carries no positionId,
    // and the indexer does NOT decrement the underlying position's remainingAmount
    // when it happens — so adding it here would count the same deposit twice.
    // Verified against depositor 0xda715761, whose receipt-token redemptions match
    // its still-open positions to the cent.
    const price = redemption.positionId ? (positionPrices.get(redemption.positionId) ?? 0) : 0;
    if (price <= 0) continue;

    leveredDepositsUsd += amount;
    leveredConvertibleOhm += amount / price;
    strikes.push({ amountUsd: amount, conversionPrice: price });
  }

  const grossDepositsUsd = openDepositsUsd + leveredDepositsUsd;
  const grossConvertibleOhm = openConvertibleOhm + leveredConvertibleOhm;
  const unencumberedDepositsUsd = Math.max(0, grossDepositsUsd - encumberedDepositsUsd);

  return {
    grossDepositsUsd,
    grossConvertibleOhm,
    leveredDepositsUsd,
    borrowedPrincipalUsd,
    encumberedDepositsUsd,
    // TVL minus borrows, which is the same as the deposits nobody has drawn against
    // plus the collateral the treasury keeps net of the principal it lent out.
    netDepositsUsd: Math.max(0, grossDepositsUsd - borrowedPrincipalUsd),
    netConvertibleOhm:
      grossDepositsUsd > 0 ? grossConvertibleOhm * (unencumberedDepositsUsd / grossDepositsUsd) : 0,
    strikes,
  };
}

export function summarizeMoneyness(
  strikes: ConversionStrike[],
  ohmPrice: number,
): MoneynessSummary {
  let inTheMoneyUsd = 0;
  let inTheMoneyCount = 0;
  let outOfTheMoneyUsd = 0;
  let outOfTheMoneyCount = 0;
  let unrealizedGainUsd = 0;
  let weightedTotal = 0;
  let weight = 0;

  for (const { amountUsd, conversionPrice } of strikes) {
    if (amountUsd <= 0 || conversionPrice <= 0) continue;

    if (ohmPrice > conversionPrice) {
      inTheMoneyUsd += amountUsd;
      inTheMoneyCount += 1;
      // Converting turns amountUsd into amountUsd/strike OHM, worth that much at spot.
      unrealizedGainUsd += amountUsd * (ohmPrice / conversionPrice - 1);
    } else {
      outOfTheMoneyUsd += amountUsd;
      outOfTheMoneyCount += 1;
    }

    weightedTotal += amountUsd * conversionPrice;
    weight += amountUsd;
  }

  const weightedConversionPrice = weight > 0 ? weightedTotal / weight : 0;

  return {
    inTheMoneyUsd,
    inTheMoneyCount,
    outOfTheMoneyUsd,
    outOfTheMoneyCount,
    totalUsd: inTheMoneyUsd + outOfTheMoneyUsd,
    totalCount: inTheMoneyCount + outOfTheMoneyCount,
    unrealizedGainUsd,
    weightedConversionPrice,
    breakevenMovePercent:
      ohmPrice > 0 && weightedConversionPrice > 0
        ? (weightedConversionPrice / ohmPrice - 1) * 100
        : 0,
  };
}
