import { describe, it, expect } from "vitest";
import { render, screen } from "@/test/test-utils";
import { ApprovalQuorumBar } from "@/modules/governance/components/approval-quorum-bar";

const defaultProps = {
  percentage: 60,
  threshold: 50,
  forPercent: 60,
  againstPercent: 40,
};

function getCells(container: HTMLElement): HTMLElement[] {
  const bar = container.querySelector<HTMLElement>(
    '[data-slot="approval-quorum-bar"] > div:last-child',
  );
  if (!bar) return [];
  // leaf divs (no children) that are not the 1px spacer
  return Array.from(bar.querySelectorAll<HTMLElement>("div")).filter(
    (el) => el.children.length === 0 && !el.classList.contains("w-px"),
  );
}

describe("ApprovalQuorumBar", () => {
  it("renders the percentage as integer", () => {
    render(<ApprovalQuorumBar {...defaultProps} percentage={60} />);
    expect(screen.getByText("60%")).toBeInTheDocument();
  });

  it("renders the threshold value", () => {
    render(<ApprovalQuorumBar {...defaultProps} threshold={50} />);
    expect(screen.getByText("/ 50%")).toBeInTheDocument();
  });

  it("rounds percentage to nearest integer", () => {
    render(<ApprovalQuorumBar {...defaultProps} percentage={33.7} />);
    expect(screen.getByText("34%")).toBeInTheDocument();
  });

  it("displays the raw negative percentage (bar clamps to 0 width)", () => {
    render(<ApprovalQuorumBar {...defaultProps} percentage={-10} forPercent={0} />);
    expect(screen.getByText("-10%")).toBeInTheDocument();
  });

  it("displays percentage above 100 (bar clamps to 100% width)", () => {
    render(<ApprovalQuorumBar {...defaultProps} percentage={150} forPercent={100} />);
    expect(screen.getByText("150%")).toBeInTheDocument();
  });

  it("renders the optional label", () => {
    render(<ApprovalQuorumBar {...defaultProps} label="Approval" />);
    expect(screen.getByText("Approval")).toBeInTheDocument();
  });

  it("renders the optional icon slot", () => {
    render(<ApprovalQuorumBar {...defaultProps} icon={<span data-testid="status-icon" />} />);
    expect(screen.getByTestId("status-icon")).toBeInTheDocument();
  });

  it("renders 10 cells split by the threshold at a 30/70 boundary", () => {
    const { container } = render(
      <ApprovalQuorumBar {...defaultProps} threshold={30} forPercent={50} againstPercent={0} />,
    );
    const cells = getCells(container);
    expect(cells.length).toBe(10);
    // 5 green cells (for=50%), 5 empty cells
    expect(cells.filter((c) => c.classList.contains("bg-green")).length).toBe(5);
    expect(cells.filter((c) => c.classList.contains("bg-surface-a10")).length).toBe(5);
    // 1px spacer between cell 3 and cell 4
    const bar = container.querySelector<HTMLElement>(
      '[data-slot="approval-quorum-bar"] > div:last-child',
    );
    expect(bar?.querySelectorAll(".w-px").length).toBe(1);
  });

  it("fills green cells left-to-right when for-votes exceed threshold", () => {
    const { container } = render(
      <ApprovalQuorumBar {...defaultProps} threshold={50} forPercent={80} againstPercent={20} />,
    );
    const cells = getCells(container);
    expect(cells.length).toBe(10);
    // first 8 green, last 2 red
    cells.slice(0, 8).forEach((c) => {
      expect(c.classList.contains("bg-green")).toBe(true);
    });
    cells.slice(8, 10).forEach((c) => {
      expect(c.classList.contains("bg-red")).toBe(true);
    });
  });

  it("renders red against-cells after the green fill", () => {
    const { container } = render(
      <ApprovalQuorumBar {...defaultProps} threshold={50} forPercent={0} againstPercent={40} />,
    );
    const redCells = container.querySelectorAll(".bg-red");
    expect(redCells.length).toBe(4);
  });

  it("omits the 1px spacer when threshold is 0 or 100", () => {
    const { container: c0 } = render(
      <ApprovalQuorumBar {...defaultProps} threshold={0} forPercent={50} againstPercent={0} />,
    );
    const bar0 = c0.querySelector<HTMLElement>(
      '[data-slot="approval-quorum-bar"] > div:last-child',
    );
    expect(bar0?.querySelectorAll(".w-px").length).toBe(0);

    const { container: c100 } = render(
      <ApprovalQuorumBar {...defaultProps} threshold={100} forPercent={50} againstPercent={0} />,
    );
    const bar100 = c100.querySelector<HTMLElement>(
      '[data-slot="approval-quorum-bar"] > div:last-child',
    );
    expect(bar100?.querySelectorAll(".w-px").length).toBe(0);
  });

  it("renders with data-slot attribute", () => {
    render(<ApprovalQuorumBar {...defaultProps} />);
    expect(document.querySelector('[data-slot="approval-quorum-bar"]')).toBeInTheDocument();
  });
});
