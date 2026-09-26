import type { GetGovernorProposals200DataItem } from "@/generated/indexer";

// Exactly the fields the normalizer reads, taken from the generated type so a
// field that changes shape in the spec fails here rather than at runtime. A
// `Pick` rather than the whole item because the by-id route returns the same
// fields under a different generated name, and both satisfy this.
export type IndexerProposal = Pick<
  GetGovernorProposals200DataItem,
  | "proposalId"
  | "proposer"
  | "targets"
  | "signatures"
  | "calldatas"
  | "transactionHash"
  | "description"
  | "blockTimestamp"
  | "blockNumber"
  | "startBlock"
  | "values"
>;

export type NormalizedProposal = {
  title: string;
  txHash: string;
  createdAtBlock: Date;
  details: {
    id: number;
    proposer: string;
    targets: string[];
    values: bigint[];
    signatures: string[];
    calldatas: string[];
    startBlock: number;
    description: string;
  };
};

/**
 * Normalizes an indexer proposal into a consistent shape for the UI.
 * Extracts the title from the first markdown heading in the description,
 * falling back to a truncated description snippet.
 */
export function normalizeProposal(proposal: IndexerProposal): NormalizedProposal {
  return {
    title: proposal.description.split(/#+\s|\n/g)[1] || `${proposal.description.slice(0, 20)}...`,
    txHash: proposal.transactionHash,
    createdAtBlock: new Date(Number(proposal.blockTimestamp) * 1000),
    details: {
      id: Number(proposal.proposalId),
      proposer: proposal.proposer,
      targets: proposal.targets,
      values: proposal.values.map((v) => BigInt(v)),
      signatures: proposal.signatures,
      calldatas: proposal.calldatas,
      startBlock: Number(proposal.startBlock),
      description: proposal.description,
    },
  };
}
