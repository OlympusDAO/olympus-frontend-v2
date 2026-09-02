import type { RedemptionExposure } from "@/lib/hooks/cds/conversion-exposure";
import { getConvertibleDepositsRedemptions } from "@/generated/indexer";

// `/v1/convertible-deposits/redemptions` returns redemptions and their loans as
// TWO FLAT LISTS. Ponder nested the loans inside each redemption
// (`redemption.loans.items[]`), which is the shape `calculateConversionExposure`
// reads, so the join happens here.
//
// Two things this gets right that are easy to get wrong:
//
//   * The payload is an OBJECT, not an array. Passing it straight to the
//     exposure helper is not a type error, it is a `for...of` over a
//     non-iterable — a crash.
//   * The join key is the composite `id`, NOT `redemptionId`. `redemptionId` is
//     scoped per depositor and vault: 156 redemptions carry only 80 distinct
//     values, so joining on it attaches every depositor's loans to every other
//     depositor's redemption of the same number. That inflated convertible OHM
//     by ~9% (250,028 against the correct 229,249) while row counts still
//     matched, which is exactly the kind of error a shape check does not catch.
type RedemptionsPayload = {
  redemptions: { id: string; positionId?: string; amountDecimal: string }[];
  loans: { id: string; status: string }[];
};

export function toRedemptionExposure(payload: RedemptionsPayload): RedemptionExposure[] {
  const loansByRedemption = new Map<string, { status: string }[]>();
  for (const loan of payload.loans) {
    const existing = loansByRedemption.get(loan.id);
    if (existing) existing.push({ status: loan.status });
    else loansByRedemption.set(loan.id, [{ status: loan.status }]);
  }

  return payload.redemptions.map((redemption) => ({
    positionId: redemption.positionId,
    amountDecimal: redemption.amountDecimal,
    loans: { items: loansByRedemption.get(redemption.id) ?? [] },
  }));
}

export async function fetchRedemptionExposure(limit = 1000): Promise<RedemptionExposure[]> {
  const { data } = await getConvertibleDepositsRedemptions({ limit });

  // The route applies `limit` to the two collections INDEPENDENTLY, and both
  // are id-ordered ascending. Once either fills its page the two cover
  // different id ranges, so the join below starts missing loans and quietly
  // under-reports convertible OHM — the same silent-wrong-number failure the
  // redemptionId join had. 156 redemptions and 90 loans live today, so this is
  // headroom, not a current defect; if it is ever reached the number must not
  // be trusted, hence a throw rather than a partial answer.
  if (data.redemptions.length >= limit || data.loans.length >= limit) {
    throw new Error(
      `redemptions page is full (${data.redemptions.length} redemptions, ${data.loans.length} loans, limit ${limit}); ` +
        "the two collections are paged independently, so the id join is no longer complete",
    );
  }

  return toRedemptionExposure(data);
}
