export interface SettledLoanEvent {
  interestDecimal: string;
}

export interface OpenLoanInterest {
  status: string;
  interestDecimal: string;
  createdAt: string;
  dueDate: string;
}

export interface ClaimedYieldEvent {
  amountDecimal: string;
}

export interface CdRevenue {
  /** Interest actually collected, on loans that have been repaid or defaulted. */
  realizedLoanInterest: number;
  /** Contracted interest on open loans, pro-rated by elapsed term. Earned, not collected. */
  accruedLoanInterest: number;
  /** Full-term interest locked in at origination on open loans. Mostly not yet earned. */
  contractedLoanInterest: number;
  /** Deposit-asset yield swept to the treasury by the facility. */
  claimedDepositYield: number;
  /** Realized + accrued interest + claimed yield. */
  earnedToDate: number;
}

export interface CdRevenueInput {
  repaidLoans: SettledLoanEvent[];
  defaultedLoans: SettledLoanEvent[];
  openLoans: OpenLoanInterest[];
  claimedYields: ClaimedYieldEvent[];
  nowSeconds?: number;
}

const parseDecimal = (value: string | null | undefined): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const sumInterest = (events: SettledLoanEvent[]) =>
  events.reduce((total, event) => total + parseDecimal(event.interestDecimal), 0);

export function calculateCdRevenue({
  repaidLoans,
  defaultedLoans,
  openLoans,
  claimedYields,
  nowSeconds = Math.floor(Date.now() / 1000),
}: CdRevenueInput): CdRevenue {
  const realizedLoanInterest = sumInterest(repaidLoans) + sumInterest(defaultedLoans);

  let accruedLoanInterest = 0;
  let contractedLoanInterest = 0;

  for (const loan of openLoans) {
    if (loan.status !== "active") continue;

    const interest = parseDecimal(loan.interestDecimal);
    if (interest <= 0) continue;

    contractedLoanInterest += interest;

    // The vault fixes a loan's interest at origination for its whole term, so the
    // amount earned so far is that figure pro-rated by elapsed time.
    const createdAt = parseDecimal(loan.createdAt);
    const dueDate = parseDecimal(loan.dueDate);
    const term = dueDate - createdAt;
    if (term <= 0) continue;

    const elapsed = Math.min(Math.max(nowSeconds - createdAt, 0), term);
    accruedLoanInterest += (interest * elapsed) / term;
  }

  const claimedDepositYield = claimedYields.reduce(
    (total, event) => total + parseDecimal(event.amountDecimal),
    0,
  );

  return {
    realizedLoanInterest,
    accruedLoanInterest,
    contractedLoanInterest,
    claimedDepositYield,
    earnedToDate: realizedLoanInterest + accruedLoanInterest + claimedDepositYield,
  };
}
