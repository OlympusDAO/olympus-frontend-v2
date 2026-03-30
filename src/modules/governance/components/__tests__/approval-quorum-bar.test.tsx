import { describe, it, expect } from "vitest";
import { render, screen } from "@/test/test-utils";
import { ApprovalQuorumBar } from "@/modules/governance/components/approval-quorum-bar";

const defaultProps = {
  percentage: 60,
  threshold: 50,
  forPercent: 60,
  againstPercent: 40,
  thresholdMet: false,
};

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

  it("sets the for-segment width to match forPercent", () => {
    const { container } = render(
      <ApprovalQuorumBar {...defaultProps} forPercent={75} againstPercent={25} />,
    );
    const fills = container.querySelectorAll<HTMLElement>('[style*="width"]');
    // First fill is the for segment
    const forFill = Array.from(fills).find((el) => el.style.width === "75%");
    expect(forFill).toBeTruthy();
  });

  it("uses green fill when thresholdMet is true", () => {
    const { container } = render(
      <ApprovalQuorumBar {...defaultProps} thresholdMet={true} forPercent={80} />,
    );
    const fills = container.querySelectorAll<HTMLElement>('[style*="width"]');
    const forFill = Array.from(fills).find((el) => el.style.width === "80%");
    expect(forFill!.className).toContain("bg-green-500");
  });

  it("uses dimmed green fill when thresholdMet is false", () => {
    const { container } = render(
      <ApprovalQuorumBar {...defaultProps} thresholdMet={false} forPercent={30} />,
    );
    const fills = container.querySelectorAll<HTMLElement>('[style*="width"]');
    const forFill = Array.from(fills).find((el) => el.style.width === "30%");
    expect(forFill!.className).toContain("bg-green-500/60");
  });

  it("renders a threshold tick marker", () => {
    const { container } = render(<ApprovalQuorumBar {...defaultProps} threshold={60} />);
    // The tick is positioned absolutely at the threshold percentage
    const tick = container.querySelector<HTMLElement>('[style*="left: 60%"]');
    expect(tick).toBeTruthy();
  });

  it("renders with data-slot attribute", () => {
    render(<ApprovalQuorumBar {...defaultProps} />);
    expect(document.querySelector('[data-slot="approval-quorum-bar"]')).toBeInTheDocument();
  });

  it("renders against segment with red fill", () => {
    const { container } = render(
      <ApprovalQuorumBar {...defaultProps} forPercent={0} againstPercent={40} />,
    );
    const fills = container.querySelectorAll<HTMLElement>('[style*="width"]');
    const againstFill = Array.from(fills).find((el) => el.style.width === "40%");
    expect(againstFill!.className).toContain("bg-red-500/60");
  });
});
