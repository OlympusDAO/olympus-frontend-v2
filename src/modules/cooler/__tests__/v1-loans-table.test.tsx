import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { parseUnits } from "viem";
import { V1LoansTable } from "../components/v1-loans-table";
import type { CoolerLoan } from "@/lib/hooks/cooler/useGetCoolerLoans";

function createMockLoan(overrides: Partial<CoolerLoan> = {}): CoolerLoan {
  return {
    loanId: 0,
    request: {
      amount: parseUnits("1000", 18),
      interest: parseUnits("0.005", 18),
      loanToCollateral: parseUnits("3000", 18),
      duration: 121n * 86400n,
      active: false,
      requester: "0x0000000000000000000000000000000000000000" as `0x${string}`,
    },
    principal: parseUnits("1000", 18),
    interestDue: parseUnits("5", 18),
    collateral: parseUnits("1", 18),
    expiry: BigInt(Math.floor(Date.now() / 1000) + 86400 * 30), // 30 days from now
    lender: "0x1234567890abcdef1234567890abcdef12345678" as `0x${string}`,
    repayDirect: true,
    callback: false,
    debtAssetName: "DAI",
    ...overrides,
  };
}

describe("V1LoansTable", () => {
  it("shows loading state", () => {
    render(<V1LoansTable loans={[]} onRepay={vi.fn()} onExtend={vi.fn()} isLoading={true} />);

    expect(screen.getByText("Loading loans...")).toBeDefined();
  });

  it("shows empty state when no loans", () => {
    render(<V1LoansTable loans={[]} onRepay={vi.fn()} onExtend={vi.fn()} isLoading={false} />);

    expect(screen.getByText("No loans found")).toBeDefined();
  });

  it("renders loan rows with correct columns", () => {
    const loan = createMockLoan();

    render(<V1LoansTable loans={[loan]} onRepay={vi.fn()} onExtend={vi.fn()} isLoading={false} />);

    // Column headers
    expect(screen.getByText("Collateral")).toBeDefined();
    expect(screen.getByText("Interest Rate")).toBeDefined();
    expect(screen.getByText("Repayment")).toBeDefined();
    expect(screen.getByText("Maturity Date")).toBeDefined();
    expect(screen.getByText("Actions")).toBeDefined();

    // Loan data
    expect(screen.getByText(/gOHM/)).toBeDefined(); // Collateral
    expect(screen.getByText(/DAI/)).toBeDefined(); // Debt asset
  });

  it("renders Repay and Extend buttons per row", () => {
    const loan = createMockLoan();

    render(<V1LoansTable loans={[loan]} onRepay={vi.fn()} onExtend={vi.fn()} isLoading={false} />);

    expect(screen.getByText("Repay")).toBeDefined();
    expect(screen.getByText("Extend")).toBeDefined();
  });

  it("calls onRepay when Repay button is clicked", async () => {
    const user = userEvent.setup();
    const onRepay = vi.fn();
    const loan = createMockLoan();

    render(<V1LoansTable loans={[loan]} onRepay={onRepay} onExtend={vi.fn()} isLoading={false} />);

    await user.click(screen.getByText("Repay"));
    expect(onRepay).toHaveBeenCalledWith(loan);
  });

  it("calls onExtend when Extend button is clicked", async () => {
    const user = userEvent.setup();
    const onExtend = vi.fn();
    const loan = createMockLoan();

    render(<V1LoansTable loans={[loan]} onRepay={vi.fn()} onExtend={onExtend} isLoading={false} />);

    await user.click(screen.getByText("Extend"));
    expect(onExtend).toHaveBeenCalledWith(loan);
  });

  it("renders multiple loan rows", () => {
    const loans = [
      createMockLoan({ loanId: 0, debtAssetName: "DAI" }),
      createMockLoan({ loanId: 1, debtAssetName: "DAI" }),
      createMockLoan({ loanId: 2, debtAssetName: "USDS" }),
    ];

    render(<V1LoansTable loans={loans} onRepay={vi.fn()} onExtend={vi.fn()} isLoading={false} />);

    // Should have 3 Repay buttons and 3 Extend buttons
    expect(screen.getAllByText("Repay")).toHaveLength(3);
    expect(screen.getAllByText("Extend")).toHaveLength(3);
  });

  it("displays 'My Loans' heading", () => {
    render(<V1LoansTable loans={[]} onRepay={vi.fn()} onExtend={vi.fn()} isLoading={false} />);

    expect(screen.getByText("My Loans")).toBeDefined();
  });
});
