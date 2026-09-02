import { cdsGraphqlClient } from "@/lib/graphql-client";
import { calculateConversionExposure, type ConversionExposure } from "./conversion-exposure";
import { calculateCdRevenue, type CdRevenue } from "./cd-revenue";
import { summarizeConversions, type ConversionSummary } from "./cd-conversions";

interface PagedResponse<T> {
  items: T[];
  pageInfo?: {
    hasNextPage: boolean;
    endCursor: string | null;
  };
}

type PagedData<T> = Record<string, PagedResponse<T> | undefined>;

/**
 * The indexer caps a page at 1000 rows and truncates silently past it, so any
 * collection we total has to be walked to the end rather than read in one shot.
 */
async function fetchAllPages<T>(
  buildQuery: (after: string | null) => string,
  select: (data: PagedData<T>) => PagedResponse<T> | undefined,
): Promise<T[]> {
  const items: T[] = [];
  let after: string | null = null;

  // Bounded so a repeating cursor can't spin forever.
  for (let page = 0; page < 50; page++) {
    const data = await cdsGraphqlClient.request<PagedData<T>>(buildQuery(after));
    const result = select(data);
    items.push(...(result?.items ?? []));

    const pageInfo = result?.pageInfo;
    if (!pageInfo?.hasNextPage || !pageInfo.endCursor) break;
    after = pageInfo.endCursor;
  }

  return items;
}

const afterArg = (after: string | null) => (after ? `, after: "${after}"` : "");

/**
 * Conversion exposure the treasury carries: gross (every deposit converts), net of
 * the principal already borrowed back out, and the per-claim strikes behind both.
 */
export async function fetchConversionExposure(): Promise<ConversionExposure> {
  const positions = await fetchAllPages<{
    positionId: string;
    remainingAmountDecimal: string;
    conversionPriceDecimal: string;
  }>(
    (after) => `
      query GetConvertiblePositions {
        convertibleDepositPositions(
          where: { chainId: 1 }
          orderBy: "positionId"
          orderDirection: "asc"
          limit: 1000${afterArg(after)}
        ) {
          items {
            positionId
            remainingAmountDecimal
            conversionPriceDecimal
          }
          pageInfo { hasNextPage endCursor }
        }
      }
    `,
    (data) => data?.convertibleDepositPositions,
  );

  const redemptions = await fetchAllPages<{
    positionId: string | null;
    receiptTokenId: string | null;
    amountDecimal: string;
    loans?: { items?: { status: string; principalDecimal: string }[] };
    finishedEvents?: { items?: unknown[] };
    cancelledEvents?: { items?: unknown[] };
  }>(
    (after) => `
      query GetRedemptions {
        redemptions(
          where: { chainId: 1 }
          orderBy: "redemptionId"
          orderDirection: "asc"
          limit: 1000${afterArg(after)}
        ) {
          items {
            positionId
            receiptTokenId
            amountDecimal
            loans {
              items {
                status
                principalDecimal
              }
            }
            finishedEvents { items { timestamp } }
            cancelledEvents { items { timestamp } }
          }
          pageInfo { hasNextPage endCursor }
        }
      }
    `,
    (data) => data?.redemptions,
  );

  return calculateConversionExposure({ positions, redemptions });
}

/** Interest on redemption-vault loans plus deposit yield swept to the treasury. */
export async function fetchCdRevenue(): Promise<CdRevenue> {
  const repaidLoans = await fetchAllPages<{ interestDecimal: string }>(
    (after) => `
      query GetLoanRepayments {
        depositRedemptionVaultLoanRepaids(
          where: { chainId: 1 }
          limit: 1000${afterArg(after)}
        ) {
          items { interestDecimal }
          pageInfo { hasNextPage endCursor }
        }
      }
    `,
    (data) => data?.depositRedemptionVaultLoanRepaids,
  );

  const defaultedLoans = await fetchAllPages<{ interestDecimal: string }>(
    (after) => `
      query GetLoanDefaults {
        depositRedemptionVaultLoanDefaulteds(
          where: { chainId: 1 }
          limit: 1000${afterArg(after)}
        ) {
          items { interestDecimal }
          pageInfo { hasNextPage endCursor }
        }
      }
    `,
    (data) => data?.depositRedemptionVaultLoanDefaulteds,
  );

  const openLoans = await fetchAllPages<{
    status: string;
    interestDecimal: string;
    createdAt: string;
    dueDate: string;
  }>(
    (after) => `
      query GetOpenLoans {
        redemptionLoans(
          where: { chainId: 1, status: "active" }
          limit: 1000${afterArg(after)}
        ) {
          items {
            status
            interestDecimal
            createdAt
            dueDate
          }
          pageInfo { hasNextPage endCursor }
        }
      }
    `,
    (data) => data?.redemptionLoans,
  );

  const claimedYields = await fetchAllPages<{ amountDecimal: string }>(
    (after) => `
      query GetClaimedYields {
        convertibleDepositFacilityClaimedYields(
          where: { chainId: 1 }
          limit: 1000${afterArg(after)}
        ) {
          items { amountDecimal }
          pageInfo { hasNextPage endCursor }
        }
      }
    `,
    (data) => data?.convertibleDepositFacilityClaimedYields,
  );

  return calculateCdRevenue({ repaidLoans, defaultedLoans, openLoans, claimedYields });
}

/**
 * Every conversion the facility has recorded. Fetched all-time regardless of the
 * chart window so the cumulative line reflects the true running total rather than
 * restarting at the window's left edge.
 */
export async function fetchConversions(windowStartSeconds: number): Promise<ConversionSummary> {
  const conversions = await fetchAllPages<{
    timestamp: string;
    depositAmountDecimal: string;
    convertedAmountDecimal: string;
  }>(
    (after) => `
      query GetConvertedDeposits {
        convertibleDepositFacilityConvertedDeposits(
          where: { chainId: 1 }
          orderBy: "timestamp"
          orderDirection: "asc"
          limit: 1000${afterArg(after)}
        ) {
          items {
            timestamp
            depositAmountDecimal
            convertedAmountDecimal
          }
          pageInfo { hasNextPage endCursor }
        }
      }
    `,
    (data) => data?.convertibleDepositFacilityConvertedDeposits,
  );

  return summarizeConversions(
    conversions.map((item) => ({ ...item, timestamp: Number(item.timestamp) })),
    windowStartSeconds,
  );
}
