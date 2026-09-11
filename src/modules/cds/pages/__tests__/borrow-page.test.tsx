import { fireEvent, screen } from "@testing-library/react";
import { parseEther } from "viem";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@/test/test-utils";
import { BorrowPage } from "../borrow-page";

const { borrowAgainstRedemption, usePreviewBorrow } = vi.hoisted(() => ({
  borrowAgainstRedemption: vi.fn(),
  usePreviewBorrow: vi.fn(),
}));

vi.mock("wagmi", () => ({
  useAccount: () => ({ address: "0x0000000000000000000000000000000000000001" }),
  useChainId: () => 1,
  useReadContracts: ({ contracts }: { contracts: Array<{ functionName: string }> }) => ({
    data:
      contracts[0]?.functionName === "getRedemptionLoan"
        ? [
            { status: "success", result: { principal: 0n } },
            { status: "success", result: { principal: 0n } },
            { status: "success", result: { principal: 0n } },
            { status: "success", result: { principal: 0n } },
          ]
        : [
            { status: "success", result: 9670n },
            { status: "success", result: 9670n },
            { status: "success", result: 9670n },
            { status: "success", result: 9670n },
          ],
  }),
}));

vi.mock("@/lib/hooks/cds/useUserRedemptions", () => ({
  useUserRedemptions: () => ({
    redemptions: [
      {
        depositToken: "0xdC035D45d973E3EC169d2276DDab16f1e407384F",
        depositPeriod: 3,
        redeemableAt: 0,
        amount: 0n,
        facility: "0xEBDe552D851DD6Dfd3D360C596D3F4aF6e5F9678",
        positionId: 0n,
      },
      {
        depositToken: "0xdC035D45d973E3EC169d2276DDab16f1e407384F",
        depositPeriod: 3,
        redeemableAt: 0,
        amount: 0n,
        facility: "0xEBDe552D851DD6Dfd3D360C596D3F4aF6e5F9678",
        positionId: 0n,
      },
      {
        depositToken: "0xdC035D45d973E3EC169d2276DDab16f1e407384F",
        depositPeriod: 6,
        redeemableAt: 0,
        amount: parseEther("1000"),
        facility: "0xEBDe552D851DD6Dfd3D360C596D3F4aF6e5F9678",
        positionId: 0n,
      },
      {
        depositToken: "0xdC035D45d973E3EC169d2276DDab16f1e407384F",
        depositPeriod: 12,
        redeemableAt: 0,
        amount: parseEther("2000"),
        facility: "0xEBDe552D851DD6Dfd3D360C596D3F4aF6e5F9678",
        positionId: 0n,
      },
    ],
    isLoading: false,
  }),
}));

vi.mock("@/lib/hooks/cds/useBorrowConfiguration", () => ({
  useMaxBorrowPercentage: () => ({
    maxBorrowDecimal: 0.967,
    isBorrowEnabledForAsset: true,
  }),
  useAnnualInterestRate: () => ({ annualInterestRatePercentage: 5.5 }),
}));

vi.mock("@/lib/hooks/cds/useBorrowAgainstRedemption", () => ({
  useBorrowAgainstRedemption: () => ({
    borrowAgainstRedemption,
    isPending: false,
    isSuccess: false,
    hash: undefined,
  }),
}));

vi.mock("@/lib/hooks/cds/usePreviewBorrow", () => ({ usePreviewBorrow }));

vi.mock("@/lib/analytics", () => ({ trackBorrowCreate: vi.fn() }));
vi.mock("@/components/icon", () => ({ Icon: () => null }));
vi.mock("../../components/borrow-active-loans", () => ({ BorrowActiveLoans: () => null }));

describe("BorrowPage", () => {
  beforeEach(() => {
    borrowAgainstRedemption.mockReset();
    usePreviewBorrow.mockReset();
    usePreviewBorrow.mockImplementation((_address, redemptionId) => ({
      previewData: {
        principal: parseEther(redemptionId === 3 ? "1934" : "967"),
        interest: parseEther(redemptionId === 3 ? "53.185" : "26.5925"),
        dueDate: 1_799_712_000,
      },
      formattedPrincipal: redemptionId === 3 ? "1934" : "967",
      formattedInterest: redemptionId === 3 ? "53.185" : "26.5925",
      dueDateFormatted: "January 12, 2027",
      isLoading: false,
      error: null,
    }));
  });

  it("shows the full-redemption preview and submits that redemption without partial controls", () => {
    render(<BorrowPage />);

    expect(screen.queryAllByRole("textbox")).toHaveLength(0);
    expect(screen.queryAllByRole("button", { name: /^(25|50|75|100)%$/ })).toHaveLength(0);
    expect(screen.getByText("1,000.00 cdUSDS-6m")).toBeInTheDocument();
    expect(screen.getByText("967.00 USDS")).toBeInTheDocument();
    expect(screen.getByText("26.5925 USDS")).toBeInTheDocument();
    expect(screen.getByText("993.5925 USDS")).toBeInTheDocument();
    expect(screen.getByText("January 12, 2027")).toBeInTheDocument();

    expect(usePreviewBorrow).toHaveBeenCalledWith("0x0000000000000000000000000000000000000001", 2);

    fireEvent.click(screen.getByRole("button", { name: "Borrow" }));
    expect(borrowAgainstRedemption).toHaveBeenCalledWith({ redemptionId: 2 });
  });

  it("previews and submits the newly selected redemption", () => {
    render(<BorrowPage />);

    fireEvent.change(screen.getByRole("combobox", { name: "Redemption" }), {
      target: { value: "1" },
    });

    expect(usePreviewBorrow).toHaveBeenLastCalledWith(
      "0x0000000000000000000000000000000000000001",
      3,
    );
    expect(screen.getByText("2,000.00 cdUSDS-12m")).toBeInTheDocument();
    expect(screen.getByText("1,934.00 USDS")).toBeInTheDocument();
    expect(screen.getByText("53.185 USDS")).toBeInTheDocument();
    expect(screen.getByText("1,987.185 USDS")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Borrow" }));
    expect(borrowAgainstRedemption).toHaveBeenCalledWith({ redemptionId: 3 });
  });
});
