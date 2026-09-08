import {
  getConvertibleDepositsClaimedYields,
  getConvertibleDepositsConvertedDeposits,
  getConvertibleDepositsLoanEvents,
  getConvertibleDepositsPositions,
  getConvertibleDepositsRedemptions,
} from "@/generated/indexer";
import { summarizeConversions, type ConversionSummary } from "@/lib/hooks/cds/cd-conversions";
import { calculateCdRevenue, type CdRevenue } from "@/lib/hooks/cds/cd-revenue";
import {
  calculateConversionExposure,
  type ConversionExposure,
} from "@/lib/hooks/cds/conversion-exposure";
import { toRedemptionExposure } from "@/lib/hooks/cds/redemption-exposure";
import { unwrap } from "@/lib/indexer/rows";

/**
 * Every route here caps a page at 1000 rows.
 *
 * Only `positions` offers an offset, so it is the only collection that can be
 * walked; the rest are read in one request. A total built from a page that came
 * back FULL is indistinguishable from a real one by the time it reaches a card,
 * so those throw rather than quietly under-reporting revenue or treasury growth.
 *
 * If one of these ever trips, the fix is an offset (or a `sinceId` cursor) on
 * that route rather than a larger constant here.
 */
const PAGE_LIMIT = 1000;

function assertComplete<T>(rows: readonly T[], collection: string): readonly T[] {
  if (rows.length >= PAGE_LIMIT) {
    throw new Error(`CD ${collection} filled a ${PAGE_LIMIT}-row page; refusing a partial total`);
  }
  return rows;
}

/** The one collection with an offset, so the only one that can be paged. */
async function fetchAllPositions() {
  const all: Awaited<ReturnType<typeof getConvertibleDepositsPositions>>["data"] = [];
  for (let offset = 0; ; offset += PAGE_LIMIT) {
    const page = await unwrap(getConvertibleDepositsPositions({ limit: PAGE_LIMIT, offset }));
    all.push(...page);
    if (page.length < PAGE_LIMIT) return all;
  }
}

/**
 * Conversion exposure the treasury carries: gross (every deposit converts), net of
 * the principal already borrowed back out, and the per-claim strikes behind both.
 */
export async function fetchConversionExposure(): Promise<ConversionExposure> {
  // Independent collections, so they are fetched in parallel rather than
  // serialising three walks on every refetch.
  const [positions, redemptionsPayload, conversions] = await Promise.all([
    fetchAllPositions(),
    unwrap(getConvertibleDepositsRedemptions({ limit: PAGE_LIMIT })),
    unwrap(getConvertibleDepositsConvertedDeposits({ order: "asc", limit: PAGE_LIMIT })),
  ]);

  assertComplete(redemptionsPayload.redemptions, "redemptions");
  assertComplete(conversions, "converted deposits");

  // Joins the two flat lists on their composite `id`; see the note there for
  // why `redemptionId` is the wrong key.
  const redemptions = toRedemptionExposure(redemptionsPayload);

  const convertedDepositsUsd = conversions.reduce((total, item) => {
    const parsed = Number(item.depositAmountDecimal);
    return total + (Number.isFinite(parsed) ? parsed : 0);
  }, 0);

  return calculateConversionExposure({ positions, redemptions, convertedDepositsUsd });
}

/** Interest on redemption-vault loans plus deposit yield swept to the treasury. */
export async function fetchCdRevenue(): Promise<CdRevenue> {
  const [loanEvents, redemptionsPayload, claimedYields] = await Promise.all([
    // Repayments and defaults arrive together: a repayment's interest is
    // collected, a default's is written off, and revenue needs both.
    unwrap(getConvertibleDepositsLoanEvents({ limit: PAGE_LIMIT })),
    unwrap(getConvertibleDepositsRedemptions({ limit: PAGE_LIMIT })),
    unwrap(getConvertibleDepositsClaimedYields({ order: "asc", limit: PAGE_LIMIT })),
  ]);

  assertComplete(loanEvents.repaid, "loan repayments");
  assertComplete(loanEvents.defaulted, "loan defaults");
  assertComplete(claimedYields, "claimed yields");

  // Loan status is trustworthy again as of
  // OlympusDAO/olympus-protocol-indexer#35, which stopped the handlers writing
  // each payment's amount over the balance — a full repayment used to leave a
  // settled loan "active", and an interest-only one used to mark a live loan
  // "repaid".
  const openLoans = redemptionsPayload.loans.filter((loan) => loan.status === "active");

  return calculateCdRevenue({
    repaidLoans: loanEvents.repaid,
    defaultedLoans: loanEvents.defaulted,
    openLoans,
    claimedYields,
  });
}

/**
 * Every conversion the facility has recorded. Fetched all-time regardless of the
 * chart window so the cumulative line reflects the true running total rather than
 * restarting at the window's left edge.
 */
export async function fetchConversions(windowStartSeconds: number): Promise<ConversionSummary> {
  const conversions = await unwrap(
    getConvertibleDepositsConvertedDeposits({ order: "asc", limit: PAGE_LIMIT }),
  );
  assertComplete(conversions, "converted deposits");

  return summarizeConversions(
    conversions.map((item) => ({ ...item, timestamp: Number(item.timestamp) })),
    windowStartSeconds,
  );
}
