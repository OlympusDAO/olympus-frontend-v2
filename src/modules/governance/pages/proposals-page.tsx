import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { usePublicClient } from "wagmi";
import { Card } from "@/components/ui/card";
import { useAccount } from "wagmi";
import { useProposals } from "@/modules/governance/hooks/useProposals";
import { VotingPowerCards } from "@/modules/governance/components/voting-power-cards";
import { ProposalRow } from "@/modules/governance/components/proposal-row";
import type { NormalizedProposal } from "@/modules/governance/helpers/normalize-proposal";
import { useContractParameters } from "@/modules/governance/hooks/useContractParameters";
import { olympusGovernorBravoAbi } from "@/abis/OlympusGovernorBravo";
import { ContractName, getContractAddress } from "@/lib/contracts";
import { mainnet } from "@/lib/chains";
import {
  PROPOSAL_STATUS_MAP,
  type ProposalStatus,
} from "@/modules/governance/helpers/proposal-status";
import { MessageSquare } from "lucide-react";

/**
 * Main proposals listing page at /dao/vote.
 * Pre-fetches on-chain status for all proposals to correctly bucket them
 * into Open vs Past sections.
 */
export function ProposalsPage() {
  const { address } = useAccount();
  const { data: proposals, isLoading } = useProposals();
  const { data: contractParams } = useContractParameters();
  const publicClient = usePublicClient({ chainId: mainnet.id });
  const governorAddress = getContractAddress(ContractName.GOVERNOR_BRAVO, mainnet.id);

  // Fetch the on-chain state for each proposal so we can bucket them
  const statusQueries = useQueries({
    queries: (proposals ?? []).map((p) => ({
      queryKey: ["governance", "proposalState", mainnet.id, p.details.id],
      queryFn: async () => {
        if (!publicClient || !governorAddress) return null;
        const state = await publicClient.readContract({
          address: governorAddress,
          abi: olympusGovernorBravoAbi,
          functionName: "state",
          args: [BigInt(p.details.id)],
        });
        return PROPOSAL_STATUS_MAP[state] ?? ("Pending" as ProposalStatus);
      },
      enabled: !!publicClient && !!governorAddress,
      staleTime: 60_000,
    })),
  });

  const allLoaded = statusQueries.every((q) => !q.isLoading);

  const { openProposals, pastProposals } = useMemo(() => {
    if (!proposals || !allLoaded) {
      return { openProposals: [], pastProposals: [] };
    }

    const open: NormalizedProposal[] = [];
    const past: NormalizedProposal[] = [];

    proposals.forEach((proposal, i) => {
      const status = statusQueries[i]?.data;
      if (status === "Active" || status === "Pending") {
        open.push(proposal);
      } else {
        past.push(proposal);
      }
    });

    return { openProposals: open, pastProposals: past };
  }, [proposals, allLoaded, statusQueries]);

  const isLoadingAll = isLoading || !allLoaded;

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      {address && <VotingPowerCards />}

      {isLoadingAll ? (
        <Card className="p-12">
          <div className="flex items-center justify-center text-secondary-t">
            Loading proposals...
          </div>
        </Card>
      ) : (
        <>
          {/* Open Proposals */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Open Proposals</h2>
            {openProposals.length === 0 ? (
              <Card className="flex flex-col items-center justify-center py-10">
                <MessageSquare className="h-8 w-8 mb-3 text-tertiary-t opacity-50" />
                <p className="text-sm text-secondary-t">No Open Proposals</p>
              </Card>
            ) : (
              <ProposalTable proposals={openProposals} params={contractParams} />
            )}
          </div>

          {/* Past Proposals */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Past Proposals</h2>
            {pastProposals.length > 0 && (
              <ProposalTable proposals={pastProposals} params={contractParams} />
            )}
          </div>
        </>
      )}
    </div>
  );
}

function ProposalTable({
  proposals,
  params,
}: {
  proposals: NormalizedProposal[];
  params: ReturnType<typeof useContractParameters>["data"];
}) {
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-a5-b text-left text-sm text-secondary-t">
              <th className="px-4 py-3 font-medium">Proposal</th>
              <th className="px-4 py-3 font-medium">Approval</th>
              <th className="px-4 py-3 font-medium">Quorum</th>
              <th className="px-4 py-3 font-medium text-right">Total Votes</th>
            </tr>
          </thead>
          <tbody>
            {proposals.map((proposal) => (
              <ProposalRow
                key={proposal.details.id}
                proposalId={proposal.details.id}
                title={proposal.title}
                createdAt={proposal.createdAtBlock}
                params={params}
              />
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
