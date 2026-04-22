import { describe, it, expect } from "vitest";
import { render, screen } from "@/test/test-utils";
import { ProposalStatusBadge } from "@/modules/governance/components/proposal-status-badge";
import type { ProposalStatus } from "@/modules/governance/helpers/proposal-status";

describe("ProposalStatusBadge", () => {
  it("renders the status text", () => {
    render(<ProposalStatusBadge status="Active" />);
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("renders with data-slot attribute", () => {
    render(<ProposalStatusBadge status="Pending" />);
    expect(document.querySelector('[data-slot="proposal-status-badge"]')).toBeInTheDocument();
  });

  describe("color classes", () => {
    it("applies blue classes for Active", () => {
      render(<ProposalStatusBadge status="Active" />);
      expect(screen.getByText("Active").className).toContain("text-blue");
    });

    it("applies yellow classes for Pending", () => {
      render(<ProposalStatusBadge status="Pending" />);
      expect(screen.getByText("Pending").className).toContain("text-yellow");
    });

    it("applies green classes for Executed", () => {
      render(<ProposalStatusBadge status="Executed" />);
      expect(screen.getByText("Executed").className).toContain("text-green");
    });

    it("applies teal classes for Queued", () => {
      render(<ProposalStatusBadge status="Queued" />);
      expect(screen.getByText("Queued").className).toContain("text-[rgb(69_175_187)]");
    });

    it("applies purple classes for Succeeded", () => {
      render(<ProposalStatusBadge status="Succeeded" />);
      expect(screen.getByText("Succeeded").className).toContain("text-[rgb(180_98_208)]");
    });

    it("applies neutral classes for Expired", () => {
      render(<ProposalStatusBadge status="Expired" />);
      expect(screen.getByText("Expired").className).toContain("text-secondary-t");
    });

    const redStatuses: ProposalStatus[] = ["Canceled", "Defeated", "Vetoed", "Emergency"];
    redStatuses.forEach((status) => {
      it(`applies red classes for ${status}`, () => {
        render(<ProposalStatusBadge status={status} />);
        expect(screen.getByText(status).className).toContain("text-red");
      });
    });
  });

  it("merges extra className prop", () => {
    render(<ProposalStatusBadge status="Active" className="my-custom-class" />);
    expect(screen.getByText("Active").className).toContain("my-custom-class");
  });
});
