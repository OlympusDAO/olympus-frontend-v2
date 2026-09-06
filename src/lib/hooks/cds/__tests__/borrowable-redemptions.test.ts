import { describe, expect, it } from "vitest";
import {
  selectBorrowableRedemptions,
  type ContractRead,
  type LoanSlot,
} from "@/lib/hooks/cds/borrowable-redemptions";

const noLoan: ContractRead<LoanSlot> = { status: "success", result: { principal: 0n } };
const liveLoan: ContractRead<LoanSlot> = { status: "success", result: { principal: 500n } };
const borrowOn: ContractRead<number> = { status: "success", result: 9670 };
const borrowOff: ContractRead<number> = { status: "success", result: 0 };

describe("selectBorrowableRedemptions", () => {
  it("skips spent slots so a finished redemption is never offered as collateral", () => {
    // Mainnet shape of 0xda71…c13e: slot 0 is a finished 3-month redemption,
    // slots 1-3 are the live 6-month ones, each already carrying a loan.
    const selection = selectBorrowableRedemptions(
      [{ amount: 0n }, { amount: 999n }, { amount: 2959n }, { amount: 2862n }],
      [noLoan, liveLoan, liveLoan, liveLoan],
      [borrowOn, borrowOn, borrowOn, borrowOn],
    );

    expect(selection.available).toEqual([]);
    expect(selection.hasFundedRedemptions).toBe(true);
    expect(selection.hasNoActiveLoans).toBe(false);
  });

  it("keeps the original index, which is the on-chain redemption id", () => {
    const selection = selectBorrowableRedemptions(
      [{ amount: 0n }, { amount: 0n }, { amount: 100n }],
      [noLoan, noLoan, noLoan],
      [borrowOn, borrowOn, borrowOn],
    );

    expect(selection.available).toEqual([{ redemption: { amount: 100n }, originalIndex: 2 }]);
  });

  it("treats a repaid loan as settled — the vault leaves dueDate set, principal is the signal", () => {
    const repaid: ContractRead<LoanSlot> = { status: "success", result: { principal: 0n } };

    const selection = selectBorrowableRedemptions([{ amount: 100n }], [repaid], [borrowOn]);

    expect(selection.available).toHaveLength(1);
    expect(selection.hasNoActiveLoans).toBe(true);
  });

  it("reports a funded, unencumbered slot whose asset has borrowing switched off", () => {
    const selection = selectBorrowableRedemptions([{ amount: 100n }], [noLoan], [borrowOff]);

    expect(selection.available).toEqual([]);
    expect(selection.hasFundedRedemptions).toBe(true);
    expect(selection.hasNoActiveLoans).toBe(true);
    expect(selection.hasBorrowEnabled).toBe(false);
  });

  it("distinguishes a wallet with only spent slots from one with none at all", () => {
    const spentOnly = selectBorrowableRedemptions([{ amount: 0n }], [noLoan], [borrowOn]);
    const empty = selectBorrowableRedemptions([], [], []);

    expect(spentOnly.hasFundedRedemptions).toBe(false);
    expect(empty.hasFundedRedemptions).toBe(false);
  });

  it("excludes a slot whose loan read failed rather than guessing it is free", () => {
    const selection = selectBorrowableRedemptions(
      [{ amount: 100n }],
      [{ status: "failure" }],
      [borrowOn],
    );

    expect(selection.available).toEqual([]);
    expect(selection.hasNoActiveLoans).toBe(false);
  });

  it("returns nothing while the loan and config reads are still in flight", () => {
    const selection = selectBorrowableRedemptions([{ amount: 100n }], undefined, undefined);

    expect(selection.available).toEqual([]);
    expect(selection.hasFundedRedemptions).toBe(true);
    expect(selection.hasBorrowEnabled).toBe(false);
  });
});
