import { describe, expect, it } from "vitest";
import { calculateCdRevenue } from "@/lib/hooks/cds/cd-revenue";

const NOW = 1_000_000;

describe("calculateCdRevenue", () => {
  it("counts interest from repaid and defaulted loans as realized", () => {
    const revenue = calculateCdRevenue({
      repaidLoans: [{ interestDecimal: "100" }, { interestDecimal: "50" }],
      defaultedLoans: [{ interestDecimal: "25" }],
      openLoans: [],
      claimedYields: [],
      nowSeconds: NOW,
    });

    expect(revenue.realizedLoanInterest).toBe(175);
    expect(revenue.earnedToDate).toBe(175);
  });

  it("pro-rates an open loan's contracted interest by elapsed term", () => {
    const revenue = calculateCdRevenue({
      repaidLoans: [],
      defaultedLoans: [],
      openLoans: [
        {
          status: "active",
          interestDecimal: "1000",
          createdAt: String(NOW - 25),
          dueDate: String(NOW + 75),
        },
      ],
      claimedYields: [],
      nowSeconds: NOW,
    });

    // The vault fixes interest at origination for the full term, so a quarter of the
    // way through the term only a quarter of it has been earned.
    expect(revenue.contractedLoanInterest).toBe(1000);
    expect(revenue.accruedLoanInterest).toBe(250);
  });

  it("stops accruing once a loan is past its due date", () => {
    const revenue = calculateCdRevenue({
      repaidLoans: [],
      defaultedLoans: [],
      openLoans: [
        {
          status: "active",
          interestDecimal: "1000",
          createdAt: String(NOW - 500),
          dueDate: String(NOW - 100),
        },
      ],
      claimedYields: [],
      nowSeconds: NOW,
    });

    expect(revenue.accruedLoanInterest).toBe(1000);
  });

  it("ignores loans that are no longer active", () => {
    const revenue = calculateCdRevenue({
      repaidLoans: [],
      defaultedLoans: [],
      openLoans: [
        {
          status: "repaid",
          interestDecimal: "1000",
          createdAt: String(NOW - 50),
          dueDate: String(NOW + 50),
        },
      ],
      claimedYields: [],
      nowSeconds: NOW,
    });

    expect(revenue.contractedLoanInterest).toBe(0);
    expect(revenue.accruedLoanInterest).toBe(0);
  });

  it("adds claimed deposit yield and totals only what has been earned", () => {
    const revenue = calculateCdRevenue({
      repaidLoans: [{ interestDecimal: "175" }],
      defaultedLoans: [],
      openLoans: [
        {
          status: "active",
          interestDecimal: "1000",
          createdAt: String(NOW - 25),
          dueDate: String(NOW + 75),
        },
      ],
      claimedYields: [{ amountDecimal: "10" }, { amountDecimal: "5" }],
      nowSeconds: NOW,
    });

    expect(revenue.claimedDepositYield).toBe(15);
    // Contracted-but-unearned interest stays out of the total.
    expect(revenue.earnedToDate).toBe(175 + 250 + 15);
  });

  it("ignores malformed decimals from the indexer", () => {
    const revenue = calculateCdRevenue({
      repaidLoans: [{ interestDecimal: "-392147.-104836010027065151" }],
      defaultedLoans: [],
      openLoans: [],
      claimedYields: [],
      nowSeconds: NOW,
    });

    expect(revenue.realizedLoanInterest).toBe(0);
  });
});
