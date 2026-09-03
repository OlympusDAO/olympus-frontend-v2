export interface ConvertiblePositionExposure {
  positionId: string;
  /** Groups positions by deposit term. Phantom balances are attributed per token. */
  receiptTokenId?: string | null;
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
   * remainingAmount when the deposit leaves through a receipt-token redemption.
   *
   * Reporting only. The correction is applied per receipt token, not with this
   * aggregate, because the phantom is not spread evenly across the book.
   *
   * TODO(OlympusDAO/olympus-protocol-indexer#34): remove this once the indexer
   * decrements the position. At that point remainingAmount can be trusted again,
   * so grossDepositsUsd goes back to summing it directly, the per-token phantom
   * accounting comes out, and the ledger inputs (initialAmountDecimal, finished
   * redemptions, convertedDepositsUsd) are no longer needed. Check this reads
   * ~1.0 against live data first: materially below means the defect is still there.
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
  /** Amount-weighted (arithmetic) conversion price across every outstanding claim. */
  weightedConversionPrice: number;
  /**
   * Percent OHM has to rise to reach that average strike.
   *
   * Deliberately not called a break-even. The price at which the book actually
   * breaks even — deposits in equal to OHM value out — is the amount-weighted
   * *harmonic* mean (grossDepositsUsd / grossConvertibleOhm), which is always
   * lower. On live data that is $20.45 against this figure's $20.48. Naming this
   * "breakeven" overstated the move, so the card that displayed it was dropped.
   */
  movePercentToAverageStrike: number;
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
 *
 * TODO(OlympusDAO/olympus-protocol-indexer#33): loan status is the signal this
 * should be able to use. It currently reports ~94 loans active against ~10 that
 * really are, and flips to "repaid" on a partial repayment, so neither direction
 * is trustworthy. Once that is fixed this gate can go and the loan status can be
 * read directly.
 */
const isPending = (redemption: RedemptionExposure) =>
  !isFinished(redemption) && !hasEvents(redemption.cancelledEvents);

export function calculateConversionExposure({
  positions,
  redemptions,
  convertedDepositsUsd = 0,
}: ConversionExposureInput): ConversionExposure {
  const positionPrices = new Map<string, number>();
  const positionsById = new Map<string, ConvertiblePositionExposure>();
  const rawStrikes: Array<ConversionStrike & { receiptTokenId: string | null }> = [];
  /** Open remaining per receipt token, the denominator of that token's phantom share. */
  const openByToken = new Map<string, number>();

  let totalDepositedUsd = 0;
  let openDepositsUsd = 0;

  for (const position of positions) {
    const price = parseDecimal(position.conversionPriceDecimal);
    const remaining = parseDecimal(position.remainingAmountDecimal);
    const token = position.receiptTokenId ?? null;

    totalDepositedUsd += parseDecimal(position.initialAmountDecimal);
    positionsById.set(position.positionId, position);

    if (price > 0) {
      positionPrices.set(position.positionId, price);
    }

    if (remaining > 0 && price > 0) {
      openDepositsUsd += remaining;
      if (token) openByToken.set(token, (openByToken.get(token) ?? 0) + remaining);
      rawStrikes.push({
        positionId: position.positionId,
        receiptTokenId: token,
        amountUsd: remaining,
        conversionPrice: price,
      });
    }
  }

  let leveredDepositsUsd = 0;
  let borrowedPrincipalUsd = 0;
  let encumberedDepositsUsd = 0;
  let finishedRedemptionsUsd = 0;
  /**
   * Balance the position table still shows for deposits that have already left
   * (OlympusDAO/olympus-protocol-indexer#34), keyed by receipt token.
   *
   * Kept per token rather than spread across the book, because it is not spread
   * across the book: today every dollar of it sits in one deposit term whose strikes
   * are the highest in the book. Scaling globally shrank near-spot buckets carrying
   * no phantom at all and left the tail more than 20x overstated.
   */
  const phantomByToken = new Map<string, number>();
  const addPhantom = (token: string | null | undefined, amount: number) => {
    if (!token || amount <= 0) return;
    phantomByToken.set(token, (phantomByToken.get(token) ?? 0) + amount);
  };
  /** Finished receipt-token redemptions per token, which carry no positionId. */
  const receiptFinishedByToken = new Map<string, number>();
  /** Position-linked redemptions per position, used to spot one that never applied. */
  const redeemedByPosition = new Map<string, number>();

  for (const redemption of redemptions) {
    const amount = parseDecimal(redemption.amountDecimal);

    if (redemption.positionId && !hasEvents(redemption.cancelledEvents) && amount > 0) {
      redeemedByPosition.set(
        redemption.positionId,
        (redeemedByPosition.get(redemption.positionId) ?? 0) + amount,
      );
    }

    if (isFinished(redemption)) {
      finishedRedemptionsUsd += amount;
      if (!redemption.positionId && redemption.receiptTokenId && amount > 0) {
        receiptFinishedByToken.set(
          redemption.receiptTokenId,
          (receiptFinishedByToken.get(redemption.receiptTokenId) ?? 0) + amount,
        );
      }
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
    // Its position already shows a zero balance, so there is no phantom to net off
    // and the strike is carried at face value.
    rawStrikes.push({
      positionId: redemption.positionId ?? null,
      receiptTokenId: null,
      amountUsd: amount,
      conversionPrice: price,
    });
  }

  // What each token's positions *should* show: face value less everything redeemed
  // against them. Position-linked redemptions attribute exactly; receipt-token ones
  // only to the token, so they come off the total.
  const expectedOpenByToken = new Map<string, number>();
  for (const position of positions) {
    const token = position.receiptTokenId;
    if (!token || parseDecimal(position.conversionPriceDecimal) <= 0) continue;
    // Only positions that still show a balance. A fully converted one contributes
    // nothing to the open total, so counting its face value here would inflate the
    // expectation and mask that much phantom elsewhere in the token.
    if (parseDecimal(position.remainingAmountDecimal) <= 0) continue;

    const redeemed = redeemedByPosition.get(position.positionId) ?? 0;
    const expected = Math.max(0, parseDecimal(position.initialAmountDecimal) - redeemed);
    expectedOpenByToken.set(token, (expectedOpenByToken.get(token) ?? 0) + expected);
  }
  for (const [token, receiptFinished] of receiptFinishedByToken) {
    expectedOpenByToken.set(token, (expectedOpenByToken.get(token) ?? 0) - receiptFinished);
  }

  // Phantom is the excess of what the table claims over that, measured rather than
  // assumed. This matters for more than tidiness: subtracting the receipt-token
  // redemptions outright would keep subtracting them once the indexer starts
  // applying them itself (#34), silently under-reporting instead of self-healing.
  for (const [token, open] of openByToken) {
    addPhantom(token, open - Math.max(0, expectedOpenByToken.get(token) ?? open));
  }

  // The ledger, not the position table, decides how much is still on deposit.
  const grossDepositsUsd = Math.max(
    0,
    totalDepositedUsd - finishedRedemptionsUsd - convertedDepositsUsd,
  );

  // Each token's open balance is discounted by its own phantom, so a term carrying
  // none is left untouched. Strikes with no token (the levered leg) pass through.
  const tokenRatio = (token: string | null) => {
    if (!token) return 1;
    const open = openByToken.get(token) ?? 0;
    if (open <= 0) return 1;
    return Math.min(1, Math.max(0, (open - (phantomByToken.get(token) ?? 0)) / open));
  };

  const strikes: ConversionStrike[] = rawStrikes.map(({ receiptTokenId, ...strike }) => ({
    ...strike,
    amountUsd: strike.amountUsd * tokenRatio(receiptTokenId),
  }));

  const grossConvertibleOhm = strikes.reduce(
    (total, strike) => total + strike.amountUsd / strike.conversionPrice,
    0,
  );

  const rawClaimedUsd = openDepositsUsd + leveredDepositsUsd;
  const reflectedUsd = strikes.reduce((total, strike) => total + strike.amountUsd, 0);
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
    positionReflectionRatio: rawClaimedUsd > 0 ? reflectedUsd / rawClaimedUsd : 0,
    strikes,
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
    movePercentToAverageStrike:
      ohmPrice > 0 && weightedConversionPrice > 0
        ? (weightedConversionPrice / ohmPrice - 1) * 100
        : 0,
  };
}
