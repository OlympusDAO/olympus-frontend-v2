import { describe, it, expect } from "vitest";
import {
  normalizeProposal,
  type IndexerProposal,
} from "@/modules/governance/helpers/normalize-proposal";
import { mockIndexerProposal } from "@/test/mocks/governance";

describe("normalizeProposal", () => {
  it("extracts title from first markdown heading", () => {
    const result = normalizeProposal(mockIndexerProposal);
    expect(result.title).toBe("Test Proposal");
  });

  it("falls back to truncated description when there is no markdown heading", () => {
    const proposal: IndexerProposal = {
      ...mockIndexerProposal,
      description: "Just a plain description without a heading",
    };
    const result = normalizeProposal(proposal);
    // No # and no \n means split gives a single element; index [1] is undefined → fallback
    // slice(0, 20) of a 42-char string = "Just a plain descrip"
    expect(result.title).toBe("Just a plain descrip...");
  });

  it("falls back to truncated description when description starts with newline content (no heading)", () => {
    // A description with a newline but no # — index [1] is the second line, which is valid text
    const proposal: IndexerProposal = {
      ...mockIndexerProposal,
      description: "First line\nSecond line",
    };
    const result = normalizeProposal(proposal);
    // Split on \n gives ["First line", "Second line"] — index [1] = "Second line"
    expect(result.title).toBe("Second line");
  });

  it("uses fallback for empty description", () => {
    const proposal: IndexerProposal = {
      ...mockIndexerProposal,
      description: "",
    };
    const result = normalizeProposal(proposal);
    // "".slice(0, 20) = "" → fallback title is "..."
    expect(result.title).toBe("...");
  });

  it("converts values strings to bigint array", () => {
    const proposal: IndexerProposal = {
      ...mockIndexerProposal,
      values: ["0", "1000000000000000000", "500"],
    };
    const result = normalizeProposal(proposal);
    expect(result.details.values).toEqual([0n, 1000000000000000000n, 500n]);
    result.details.values.forEach((v) => {
      expect(typeof v).toBe("bigint");
    });
  });

  it("parses blockTimestamp into a Date", () => {
    const result = normalizeProposal(mockIndexerProposal);
    // blockTimestamp "1700000000" → new Date(1700000000 * 1000)
    expect(result.createdAtBlock).toEqual(new Date(1700000000 * 1000));
  });

  it("passes through txHash unchanged", () => {
    const result = normalizeProposal(mockIndexerProposal);
    expect(result.txHash).toBe(mockIndexerProposal.transactionHash);
  });

  it("converts proposalId to a numeric id", () => {
    const result = normalizeProposal(mockIndexerProposal);
    expect(result.details.id).toBe(1);
  });

  it("converts startBlock to a number", () => {
    const result = normalizeProposal(mockIndexerProposal);
    expect(result.details.startBlock).toBe(18001000);
  });

  it("preserves arrays (targets, signatures, calldatas) as-is", () => {
    const result = normalizeProposal(mockIndexerProposal);
    expect(result.details.targets).toEqual(mockIndexerProposal.targets);
    expect(result.details.signatures).toEqual(mockIndexerProposal.signatures);
    expect(result.details.calldatas).toEqual(mockIndexerProposal.calldatas);
  });

  it("preserves the full description in details", () => {
    const result = normalizeProposal(mockIndexerProposal);
    expect(result.details.description).toBe(mockIndexerProposal.description);
  });
});
