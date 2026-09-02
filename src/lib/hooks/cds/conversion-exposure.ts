export interface ConvertiblePositionExposure {
  positionId: string;
  initialAmountDecimal: string;
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
  positionId: string | null;
  amountUsd: number;
  conversionPrice: number;
}

export interface ConversionExposure {
  /**
   * Deposits still held by the facility: everything ever deposited, less what has
   * finished redeeming or already converted. Derived from the deposit ledger rather
   * than from summed remainingAmount, which overstates (see positionReflectionRatio).
   */
  grossDepositsUsd: number;
  grossConvertibleOhm: number;
  /** Everything ever deposited, at position face value. */
  totalDepositedUsd: number;
  /** Deposits that completed a redemption and left the facility. */
  finishedRedemptionsUsd: number;
  /** The levered leg: collateral behind a pending redemption that has drawn a loan. */
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
  /**
   * How much of what the position table claims is actually still on deposit, in
   * [0, 1]. Below 1 because the indexer does not decrement a position's
   * remainingAmount when the deposit leaves through a receipt-token redemption, and
   * because position 0 kept its full remainingAmount through a finished redemption.
   * Strike amounts and the OHM legs are scaled by it so every figure ties back to
   * the ledger.
   */
  positionReflectionRatio: number;
  /** Per-claim strikes, for moneyness. Scaled by positionReflectionRatio. */
  strikes: ConversionStrike[];
}

export interface ConversionExposureInput {
  positions: ConvertiblePositionExposure[];
  redemptions: RedemptionExposure[];
  /** Deposits that have already converted to OHM, so are no longer redeemable. */
  convertedDepositsUsd?: number;
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

const hasEvents = (events?: { items?: unknown[] }) => (events?.items?.length ?? 0) > 0;

const isFinished = (redemption: RedemptionExposure) => hasEvents(redemption.finishedEvents);

/**
 * A redemption still in flight — neither completed nor reversed. Loans keep a stale
 * "active" status after their redemption finishes, so the lifecycle, not the loan
 * status, decides what is really outstanding.
 */
const isPending = (redemption: RedemptionExposure) =>
  !isFinished(redemption) && !hasEvents(redemption.cancelledEvents);

export function calculateConversionExposure({
  positions,
  redemptions,
  convertedDepositsUsd = 0,
}: ConversionExposureInput): ConversionExposure {
  const positionPrices = new Map<string, number>();
  const rawStrikes: ConversionStrike[] = [];

  let totalDepositedUsd = 0;
  let openDepositsUsd = 0;
  let openConvertibleOhm = 0;

  for (const position of positions) {
    const price = parseDecimal(position.conversionPriceDecimal);
    const remaining = parseDecimal(position.remainingAmountDecimal);

    totalDepositedUsd += parseDecimal(position.initialAmountDecimal);

    if (price > 0) {
      positionPrices.set(position.positionId, price);
    }

    if (remaining > 0 && price > 0) {
      openDepositsUsd += remaining;
      openConvertibleOhm += remaining / price;
      rawStrikes.push({
        positionId: position.positionId,
        amountUsd: remaining,
        conversionPrice: price,
      });
    }
  }

  let leveredDepositsUsd = 0;
  let leveredConvertibleOhm = 0;
  let borrowedPrincipalUsd = 0;
  let encumberedDepositsUsd = 0;
  let finishedRedemptionsUsd = 0;

  for (const redemption of redemptions) {
    const amount = parseDecimal(redemption.amountDecimal);

    if (isFinished(redemption)) {
      // The deposit left the facility. The position it came from may still show its
      // full remainingAmount, which is exactly what positionReflectionRatio corrects.
      finishedRedemptionsUsd += amount;
      continue;
    }

    // A cancelled redemption handed the position back, where it is counted via
    // remainingAmount.
    if (!isPending(redemption)) continue;

    const activeLoans = (redemption.loans?.items ?? []).filter(isActive);
    if (activeLoans.length === 0 || amount <= 0) continue;

    // Every dollar lent out is netted, whichever route collateralised it, and the
    // deposit behind it is spoken for either way.
    encumberedDepositsUsd += amount;
    for (const loan of activeLoans) {
      borrowedPrincipalUsd += parseDecimal(loan.principalDecimal);
    }

    // ...but only a redemption started against a specific position adds a strike.
    // A redemption taken through the fungible receipt token carries no positionId,
    // and the indexer does NOT decrement the underlying position's remainingAmount
    // when it happens — so adding it here would count the same deposit twice.
    const price = redemption.positionId ? (positionPrices.get(redemption.positionId) ?? 0) : 0;
    if (price <= 0) continue;

    leveredDepositsUsd += amount;
    leveredConvertibleOhm += amount / price;
    rawStrikes.push({
      positionId: redemption.positionId ?? null,
      amountUsd: amount,
      conversionPrice: price,
    });
  }

  // The ledger, not the position table, decides how much is still on deposit.
  const grossDepositsUsd = Math.max(
    0,
    totalDepositedUsd - finishedRedemptionsUsd - convertedDepositsUsd,
  );

  const rawClaimedUsd = openDepositsUsd + leveredDepositsUsd;
  const positionReflectionRatio =
    rawClaimedUsd > 0 ? Math.min(1, grossDepositsUsd / rawClaimedUsd) : 0;

  const grossConvertibleOhm =
    (openConvertibleOhm + leveredConvertibleOhm) * positionReflectionRatio;

  const unencumberedDepositsUsd = Math.max(0, grossDepositsUsd - encumberedDepositsUsd);

  return {
    grossDepositsUsd,
    grossConvertibleOhm,
    totalDepositedUsd,
    finishedRedemptionsUsd,
    leveredDepositsUsd,
    borrowedPrincipalUsd,
    encumberedDepositsUsd,
    // TVL minus borrows, which is the same as the deposits nobody has drawn against
    // plus the collateral the treasury keeps net of the principal it lent out.
    netDepositsUsd: Math.max(0, grossDepositsUsd - borrowedPrincipalUsd),
    netConvertibleOhm:
      grossDepositsUsd > 0 ? grossConvertibleOhm * (unencumberedDepositsUsd / grossDepositsUsd) : 0,
    positionReflectionRatio,
    strikes: rawStrikes.map((strike) => ({
      ...strike,
      amountUsd: strike.amountUsd * positionReflectionRatio,
    })),
  };
}

export function summarizeMoneyness(
  strikes: ConversionStrike[],
  ohmPrice: number,
): MoneynessSummary {
  let inTheMoneyUsd = 0;
  let outOfTheMoneyUsd = 0;
  let unrealizedGainUsd = 0;
  let weightedTotal = 0;
  let weight = 0;

  // Counted per position, not per claim: one position can contribute both a residual
  // remainingAmount and a pending redemption, and it is still one position.
  const inTheMoney = new Set<string>();
  const outOfTheMoney = new Set<string>();
  let anonymous = 0;

  for (const { positionId, amountUsd, conversionPrice } of strikes) {
    if (amountUsd <= 0 || conversionPrice <= 0) continue;

    const key = positionId ?? `anonymous-${anonymous++}`;

    if (ohmPrice > conversionPrice) {
      inTheMoneyUsd += amountUsd;
      inTheMoney.add(key);
      // Converting turns amountUsd into amountUsd/strike OHM, worth that much at spot.
      unrealizedGainUsd += amountUsd * (ohmPrice / conversionPrice - 1);
    } else {
      outOfTheMoneyUsd += amountUsd;
      outOfTheMoney.add(key);
    }

    weightedTotal += amountUsd * conversionPrice;
    weight += amountUsd;
  }

  const weightedConversionPrice = weight > 0 ? weightedTotal / weight : 0;

  return {
    inTheMoneyUsd,
    inTheMoneyCount: inTheMoney.size,
    outOfTheMoneyUsd,
    outOfTheMoneyCount: outOfTheMoney.size,
    totalUsd: inTheMoneyUsd + outOfTheMoneyUsd,
    totalCount: new Set([...inTheMoney, ...outOfTheMoney]).size,
    unrealizedGainUsd,
    weightedConversionPrice,
    breakevenMovePercent:
      ohmPrice > 0 && weightedConversionPrice > 0
        ? (weightedConversionPrice / ohmPrice - 1) * 100
        : 0,
  };
}
