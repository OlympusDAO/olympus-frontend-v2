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
    const greenStatuses: ProposalStatus[] = ["Active", "Succeeded", "Executed"];
    greenStatuses.forEach((status) => {
      it(`applies green classes for ${status}`, () => {
        render(<ProposalStatusBadge status={status} />);
        const badge = screen.getByText(status);
        expect(badge.className).toContain("text-green-400");
      });
    });

    it("applies yellow classes for Pending", () => {
      render(<ProposalStatusBadge status="Pending" />);
      const badge = screen.getByText("Pending");
      expect(badge.className).toContain("text-yellow-400");
    });

    it("applies blue classes for Queued", () => {
      render(<ProposalStatusBadge status="Queued" />);
      const badge = screen.getByText("Queued");
      expect(badge.className).toContain("text-blue-400");
    });

    it("applies gray classes for Expired", () => {
      render(<ProposalStatusBadge status="Expired" />);
      const badge = screen.getByText("Expired");
      expect(badge.className).toContain("text-gray-400");
    });

    const redStatuses: ProposalStatus[] = ["Canceled", "Defeated", "Vetoed", "Emergency"];
    redStatuses.forEach((status) => {
      it(`applies red classes for ${status}`, () => {
        render(<ProposalStatusBadge status={status} />);
        const badge = screen.getByText(status);
        expect(badge.className).toContain("text-red-400");
      });
    });
  });

  it("merges extra className prop", () => {
    render(<ProposalStatusBadge status="Active" className="my-custom-class" />);
    const badge = screen.getByText("Active");
    expect(badge.className).toContain("my-custom-class");
  });
});
