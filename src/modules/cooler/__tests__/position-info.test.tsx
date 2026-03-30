import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { parseUnits } from "viem";
import { PositionInfo } from "../components/position-info";

// Mock the Icon component to avoid SVG rendering issues in jsdom
vi.mock("@/components/icon", () => ({
  Icon: ({ name, className }: { name: string; className?: string }) => (
    <span data-testid={`icon-${name}`} className={className} />
  ),
}));

describe("PositionInfo", () => {
  const defaultProps = {
    projectedCollateral: parseUnits("10", 18),
    projectedDebt: parseUnits("5000", 18),
    liquidationThreshold: parseUnits("8500", 18),
    additionalBorrowingAvailable: parseUnits("2000", 18),
    maxPotentialBorrowAmount: parseUnits("7000", 18),
    currentDebt: parseUnits("5000", 18),
    isRepayMode: false,
  };

  it("renders all position fields when data exists", () => {
    render(<PositionInfo {...defaultProps} />);

    expect(screen.getByText("Collateral")).toBeDefined();
    expect(screen.getByText("Debt")).toBeDefined();
    expect(screen.getByText("LTV")).toBeDefined();
    expect(screen.getByText("Buffer to Liquidation")).toBeDefined();
    expect(screen.getByText("Available to Borrow")).toBeDefined();
  });

  it("displays formatted gOHM value with 4 decimals", () => {
    render(<PositionInfo {...defaultProps} />);

    // 10 gOHM formatted
    expect(screen.getByText(/10\.0000 gOHM/)).toBeDefined();
  });

  it("displays formatted USDS debt with 2 decimals", () => {
    render(<PositionInfo {...defaultProps} />);

    // 5000 USDS formatted
    expect(screen.getByText(/5,000\.00 USDS/)).toBeDefined();
  });

  it("shows empty state when no position data", () => {
    render(
      <PositionInfo
        projectedCollateral={0n}
        projectedDebt={0n}
        liquidationThreshold={0n}
        additionalBorrowingAvailable={0n}
        maxPotentialBorrowAmount={0n}
        currentDebt={0n}
        isRepayMode={false}
      />,
    );

    expect(screen.getByText("No position")).toBeDefined();
  });

  it("shows 'Position Overview' in borrow mode", () => {
    render(<PositionInfo {...defaultProps} />);

    expect(screen.getByText("Position Overview")).toBeDefined();
  });

  it("shows 'Projected Position' in repay mode", () => {
    render(<PositionInfo {...defaultProps} isRepayMode={true} />);

    expect(screen.getByText("Projected Position")).toBeDefined();
  });

  it("calculates buffer to liquidation correctly", () => {
    render(<PositionInfo {...defaultProps} />);

    // Buffer = 8500 - 5000 = 3500 USDS
    expect(screen.getByText(/3,500\.00 USDS/)).toBeDefined();
  });

  it("shows zero buffer when debt exceeds liquidation threshold", () => {
    render(
      <PositionInfo
        {...defaultProps}
        projectedDebt={parseUnits("9000", 18)}
        liquidationThreshold={parseUnits("8500", 18)}
      />,
    );

    // Buffer to Liquidation row should show 0.00 USDS
    const bufferLabel = screen.getByText("Buffer to Liquidation");
    const bufferRow = bufferLabel.closest("div[class*='flex items-center justify-between']")!;
    expect(bufferRow.textContent).toContain("0.00");
  });
});
