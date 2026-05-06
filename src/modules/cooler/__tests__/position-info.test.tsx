import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { parseUnits } from "viem";
import { BorrowPositionInfo } from "../components/borrow-position-info.tsx";

// Mock the Icon component to avoid SVG rendering issues in jsdom
vi.mock("@/components/icon", () => ({
  Icon: ({ name, className }: { name: string; className?: string }) => (
    <span data-testid={`icon-${name}`} className={className} />
  ),
}));

describe("BorrowPositionInfo", () => {
  const defaultProps = {
    projectedCollateral: parseUnits("10", 18),
    projectedDebt: parseUnits("5000", 18),
    liquidationThreshold: parseUnits("8500", 18),
    projectedLiquidationDate: new Date("2027-01-15T00:00:00Z"),
    availableToBorrow: parseUnits("2000", 18),
    currentDebt: parseUnits("5000", 18),
  };

  it("renders all position fields when data exists", () => {
    render(<BorrowPositionInfo {...defaultProps} />);

    expect(screen.getByText("Collateral")).toBeDefined();
    expect(screen.getByText("Debt")).toBeDefined();
    expect(screen.getByText("LTV")).toBeDefined();
    expect(screen.getByText("Buffer to Liquidation")).toBeDefined();
    expect(screen.getByText("Est. Liquidation Date")).toBeDefined();
    expect(screen.getByText("Available to Borrow")).toBeDefined();
  });

  it("displays formatted gOHM value with 4 decimals", () => {
    render(<BorrowPositionInfo {...defaultProps} />);

    // 10 gOHM formatted
    expect(screen.getByText(/10\.0000 gOHM/)).toBeDefined();
  });

  it("displays formatted USDS debt with 2 decimals", () => {
    render(<BorrowPositionInfo {...defaultProps} />);

    // 5000 USDS formatted
    expect(screen.getByText(/5,000\.00 USDS/)).toBeDefined();
  });

  it("shows empty state when no position data", () => {
    render(
      <BorrowPositionInfo
        projectedCollateral={0n}
        projectedDebt={0n}
        liquidationThreshold={0n}
        projectedLiquidationDate={null}
        availableToBorrow={0n}
        currentDebt={0n}
      />,
    );

    expect(screen.getByText("No position")).toBeDefined();
  });

  it("shows 'Projected Position' heading", () => {
    render(<BorrowPositionInfo {...defaultProps} />);

    expect(screen.getByText("Projected Position")).toBeDefined();
  });

  it("calculates buffer to liquidation correctly", () => {
    render(<BorrowPositionInfo {...defaultProps} />);

    // Buffer = 8500 - 5000 = 3500 USDS
    expect(screen.getByText(/3,500\.00 USDS/)).toBeDefined();
  });

  it("shows zero buffer when debt exceeds liquidation threshold", () => {
    render(
      <BorrowPositionInfo
        {...defaultProps}
        projectedDebt={parseUnits("9000", 18)}
        liquidationThreshold={parseUnits("8500", 18)}
      />,
    );

    // Buffer to Liquidation row should show 0.00 USDS
    const bufferLabel = screen.getByText("Buffer to Liquidation");
    const bufferRow = bufferLabel.closest("div[class*='flex items-center justify-between']");
    expect(bufferRow?.textContent).toContain("0.00");
  });
});
