import type { IndexerProposal } from "@/modules/governance/helpers/normalize-proposal";

export const mockIndexerProposal: IndexerProposal = {
  proposalId: "1",
  proposer: "0x1234567890123456789012345678901234567890",
  targets: ["0xaabbccdd00000000000000000000000000000001"],
  signatures: ["transfer(address,uint256)"],
  calldatas: ["0xabcdef"],
  transactionHash: "0xabcdef1234567890",
  description: "# Test Proposal\n\nThis is a test proposal description.",
  blockTimestamp: "1700000000",
  blockNumber: "18000000",
  startBlock: "18001000",
  values: ["0"],
};
