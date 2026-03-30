import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@/test/test-utils";
import { ProposalCalldata } from "@/modules/governance/components/proposal-calldata";

// Mock the decodeCalldata helper to avoid network calls in tests
vi.mock("@/modules/governance/helpers/decode-calldata", () => ({
  decodeCalldata: vi.fn().mockResolvedValue(null),
}));

const TARGET = "0xaabbccdd00000000000000000000000000000001";
const SIGNATURE = "transfer(address,uint256)";
const CALLDATA = "0x1234abcd";

describe("ProposalCalldata", () => {
  describe("empty state", () => {
    it("shows the no-actions message when targets array is empty", () => {
      render(<ProposalCalldata targets={[]} signatures={[]} calldatas={[]} values={[]} />);
      expect(screen.getByText("No executable actions for this proposal.")).toBeInTheDocument();
    });

    it("does not render the calldata slot when targets is empty", () => {
      render(<ProposalCalldata targets={[]} signatures={[]} calldatas={[]} values={[]} />);
      expect(document.querySelector('[data-slot="proposal-calldata"]')).toBeNull();
    });
  });

  describe("single action", () => {
    it("renders an action card with 'Function 1' label", () => {
      render(
        <ProposalCalldata
          targets={[TARGET]}
          signatures={[SIGNATURE]}
          calldatas={[CALLDATA]}
          values={[0n]}
        />,
      );
      expect(screen.getByText("Function 1")).toBeInTheDocument();
    });

    it("renders the target address as a link", () => {
      render(
        <ProposalCalldata
          targets={[TARGET]}
          signatures={[SIGNATURE]}
          calldatas={[CALLDATA]}
          values={[0n]}
        />,
      );
      const link = screen.getByRole("link", { name: TARGET });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute("href", `https://etherscan.io/address/${TARGET}`);
    });

    it("renders the signature when decode fails and calldata is 0x", () => {
      render(
        <ProposalCalldata
          targets={[TARGET]}
          signatures={[SIGNATURE]}
          calldatas={["0x"]}
          values={[0n]}
        />,
      );
      expect(screen.getByText(SIGNATURE)).toBeInTheDocument();
    });

    it("shows 'Unable to decode' when decode returns null", async () => {
      render(
        <ProposalCalldata
          targets={[TARGET]}
          signatures={[SIGNATURE]}
          calldatas={[CALLDATA]}
          values={[0n]}
        />,
      );
      await waitFor(() => {
        expect(screen.getByText("Unable to decode calldata")).toBeInTheDocument();
      });
    });

    it("does not show ETH value when value is 0", () => {
      render(
        <ProposalCalldata
          targets={[TARGET]}
          signatures={[SIGNATURE]}
          calldatas={[CALLDATA]}
          values={[0n]}
        />,
      );
      expect(screen.queryByText(/Value:/)).toBeNull();
    });

    it("shows ETH value when value is greater than 0", () => {
      render(
        <ProposalCalldata
          targets={[TARGET]}
          signatures={[SIGNATURE]}
          calldatas={[CALLDATA]}
          values={[1000000000000000000n]}
        />,
      );
      expect(screen.getByText("Value: 1.0000 ETH")).toBeInTheDocument();
    });
  });

  describe("multiple actions", () => {
    const SECOND_TARGET = "0x9999999900000000000000000000000000000002";
    const SECOND_SIG = "approve(address,uint256)";

    it("renders an action card for each target", () => {
      render(
        <ProposalCalldata
          targets={[TARGET, SECOND_TARGET]}
          signatures={[SIGNATURE, SECOND_SIG]}
          calldatas={[CALLDATA, "0x5678"]}
          values={[0n, 0n]}
        />,
      );
      expect(screen.getByText("Function 1")).toBeInTheDocument();
      expect(screen.getByText("Function 2")).toBeInTheDocument();
    });

    it("renders the correct target address for each action", () => {
      render(
        <ProposalCalldata
          targets={[TARGET, SECOND_TARGET]}
          signatures={[SIGNATURE, SECOND_SIG]}
          calldatas={[CALLDATA, "0x5678"]}
          values={[0n, 0n]}
        />,
      );
      expect(screen.getByRole("link", { name: TARGET })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: SECOND_TARGET })).toBeInTheDocument();
    });

    it("shows ETH value only for the action that has a non-zero value", () => {
      render(
        <ProposalCalldata
          targets={[TARGET, SECOND_TARGET]}
          signatures={[SIGNATURE, SECOND_SIG]}
          calldatas={[CALLDATA, "0x5678"]}
          values={[0n, 500000000000000000n]}
        />,
      );
      expect(screen.getByText("Value: 0.5000 ETH")).toBeInTheDocument();
    });
  });
});
