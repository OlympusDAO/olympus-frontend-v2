/**
 * Which of a user's vault redemptions can actually be borrowed against.
 *
 * `DepositRedemptionVault.getUserRedemptions` returns an append-only array: the
 * array index IS the redemption id handed to `borrowAgainstRedemption`, so
 * slots are never removed or reordered. Two consequences drive everything here.
 *
 *   * A finished or cancelled redemption keeps its `depositPeriod` and
 *     `positionId` but has `amount == 0`. On mainnet 68 of 165 slots across 18
 *     of 21 wallets are in that state, most of them 3-month leftovers from
 *     before 6-month terms went live. Offering one as collateral is how the
 *     Borrow page came to default to `cdUSDS-3m` with a zero balance for a user
 *     whose only real deposits are 6-month.
 *   * Repaying a loan zeroes `principal` but LEAVES `dueDate` set, so `dueDate`
 *     cannot mean "this redemption is spoken for". Liveness is `principal > 0`.
 *     Testing `dueDate` would hide a redemption permanently the moment its loan
 *     was repaid.
 *
 * Filtering therefore has to carry the original index, which is why this
 * returns `{ redemption, originalIndex }` rather than a plain array.
 */

/** Minimal shape of a `getUserRedemptions` entry. */
export interface RedemptionSlot {
  amount: bigint;
}

/** Minimal shape of a `getRedemptionLoan` result. */
export interface LoanSlot {
  principal: bigint;
}

/** A `useReadContracts` result, narrowed to what the selection needs. */
export type ContractRead<T> = { status: "success"; result: T } | { status: "failure" };

export interface BorrowableRedemption<T> {
  redemption: T;
  originalIndex: number;
}

export interface BorrowableSelection<T> {
  available: BorrowableRedemption<T>[];
  /** Any slot still holding a balance — spent slots do not count. */
  hasFundedRedemptions: boolean;
  /** Any funded slot without a live loan against it. */
  hasNoActiveLoans: boolean;
  /** Any funded, unencumbered slot whose asset has borrowing switched on. */
  hasBorrowEnabled: boolean;
}

export function selectBorrowableRedemptions<T extends RedemptionSlot>(
  redemptions: readonly T[],
  loans: readonly ContractRead<LoanSlot>[] | undefined,
  borrowConfigs: readonly ContractRead<bigint | number>[] | undefined,
): BorrowableSelection<T> {
  const funded = redemptions
    .map((redemption, originalIndex) => ({ redemption, originalIndex }))
    .filter(({ redemption }) => redemption.amount > 0n);

  if (!loans || !borrowConfigs) {
    return {
      available: [],
      hasFundedRedemptions: funded.length > 0,
      hasNoActiveLoans: false,
      hasBorrowEnabled: false,
    };
  }

  let noActiveLoansCount = 0;
  const available = funded.filter(({ originalIndex }) => {
    const loanResult = loans[originalIndex];
    if (loanResult?.status !== "success") return false;
    if (loanResult.result.principal > 0n) return false;
    noActiveLoansCount++;

    const configResult = borrowConfigs[originalIndex];
    return configResult?.status === "success" && Number(configResult.result) > 0;
  });

  return {
    available,
    hasFundedRedemptions: funded.length > 0,
    hasNoActiveLoans: noActiveLoansCount > 0,
    hasBorrowEnabled: available.length > 0,
  };
}
