export type SubgraphProposal = {
  proposalId: string;
  proposer: string;
  targets: string[];
  signatures: string[];
  calldatas: string[];
  transactionHash: string;
  description: string;
  blockTimestamp: string;
  blockNumber: string;
  startBlock: string;
  values: string[];
};

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
 * Normalizes a subgraph proposal into a consistent shape for the UI.
 * Extracts the title from the first markdown heading in the description,
 * falling back to a truncated description snippet.
 */
export function normalizeProposal(proposal: SubgraphProposal): NormalizedProposal {
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
