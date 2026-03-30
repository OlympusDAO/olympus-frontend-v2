import { useState, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useEnsName } from "wagmi";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useProposal } from "@/modules/governance/hooks/useProposal";
import { useProposalDetails } from "@/modules/governance/hooks/useProposalDetails";
import { useActivateProposal } from "@/modules/governance/hooks/useActivateProposal";
import { useQueueProposal } from "@/modules/governance/hooks/useQueueProposal";
import { useExecuteProposal } from "@/modules/governance/hooks/useExecuteProposal";
import { ProposalStatusBadge } from "@/modules/governance/components/proposal-status-badge";
import { ProposalDescription } from "@/modules/governance/components/proposal-description";
import { ProposalCalldata } from "@/modules/governance/components/proposal-calldata";
import { ProposalParticipation } from "@/modules/governance/components/proposal-participation";
import { VoteSidebar } from "@/modules/governance/components/vote-sidebar";
import { VoteModal } from "@/modules/governance/components/vote-modal";
import { mainnet } from "@/lib/chains";

function truncateAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

/**
 * Single proposal detail page at /dao/vote/:id.
 * Displays proposal metadata, description/code/participation tabs, and voting sidebar.
 */
export function ProposalPage() {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState("description");
  const [voteModalOpen, setVoteModalOpen] = useState(false);

  const proposalId = id ? Number(id) : undefined;

  const { data: proposal, isLoading: isProposalLoading } = useProposal({
    proposalId: id,
  });
  const { data: details, isLoading: isDetailsLoading } = useProposalDetails({
    proposalId: proposalId ?? 0,
  });

  const { activate, isPending: isActivating } = useActivateProposal();
  const { queue, isPending: isQueueing } = useQueueProposal();
  const { execute, isPending: isExecuting } = useExecuteProposal();

  const { data: ensName } = useEnsName({
    address: proposal?.details.proposer as `0x${string}` | undefined,
    chainId: mainnet.id,
  });

  const createdDate = proposal?.createdAtBlock
    ? proposal.createdAtBlock.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : undefined;

  const proposerDisplay = useMemo(() => {
    if (ensName) return ensName;
    if (proposal?.details.proposer) return truncateAddress(proposal.details.proposer);
    return "...";
  }, [ensName, proposal?.details.proposer]);

  const currentTimestamp = Math.floor(Date.now() / 1000);

  // Action button logic based on proposal status
  const actionButton = useMemo(() => {
    if (!details || !proposalId) return null;

    if (details.status === "Pending" && details.startBlock > 0) {
      return (
        <Button onClick={() => activate({ proposalId })} disabled={isActivating}>
          {isActivating ? "Activating..." : "Activate Proposal"}
        </Button>
      );
    }

    if (details.status === "Succeeded") {
      return (
        <Button onClick={() => queue({ proposalId })} disabled={isQueueing}>
          {isQueueing ? "Queueing..." : "Queue for Execution"}
        </Button>
      );
    }

    if (details.status === "Queued" && details.eta > 0 && currentTimestamp >= details.eta) {
      return (
        <Button onClick={() => execute({ proposalId })} disabled={isExecuting}>
          {isExecuting ? "Executing..." : "Execute Proposal"}
        </Button>
      );
    }

    return null;
  }, [
    details,
    proposalId,
    isActivating,
    isQueueing,
    isExecuting,
    activate,
    queue,
    execute,
    currentTimestamp,
  ]);

  if (isProposalLoading || isDetailsLoading) {
    return (
      <div className="mx-auto max-w-7xl">
        <Card className="p-12">
          <div className="flex items-center justify-center text-secondary-t">
            Loading proposal...
          </div>
        </Card>
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="mx-auto max-w-7xl">
        <Card className="p-12">
          <div className="flex flex-col items-center justify-center text-secondary-t gap-4">
            <p>Proposal not found.</p>
            <Link to="/dao/vote">
              <Button variant="secondary">Back to Proposals</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/dao/vote" className="text-secondary-t hover:text-primary-t transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold">{proposal.title}</h1>
            {details && <ProposalStatusBadge status={details.status} />}
          </div>
          <p className="text-sm text-secondary-t mt-1">
            {createdDate && `Created ${createdDate}`}
            {proposal.details.proposer && ` | By: ${proposerDisplay}`}
          </p>
        </div>
        {actionButton}
      </div>

      {/* Main content: tabs + sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="overflow-hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList variant="underline" className="border-b border-a5-b w-full">
                <TabsTrigger variant="underline" value="description">
                  Description
                </TabsTrigger>
                <TabsTrigger variant="underline" value="executable-code">
                  Executable Code
                </TabsTrigger>
                <TabsTrigger variant="underline" value="participation">
                  Participation
                </TabsTrigger>
              </TabsList>
              <TabsContent value="description" className="p-5">
                <ProposalDescription content={proposal.details.description} />
              </TabsContent>
              <TabsContent value="executable-code" className="p-5">
                <ProposalCalldata
                  targets={proposal.details.targets}
                  signatures={proposal.details.signatures}
                  calldatas={proposal.details.calldatas}
                  values={proposal.details.values}
                />
              </TabsContent>
              <TabsContent value="participation" className="p-5">
                <ProposalParticipation proposalId={String(proposal.details.id)} />
              </TabsContent>
            </Tabs>
          </Card>
        </div>

        <div>
          {details && (
            <VoteSidebar
              proposalId={proposal.details.id}
              startBlock={details.startBlock}
              status={details.status}
              onVoteClick={() => setVoteModalOpen(true)}
            />
          )}
        </div>
      </div>

      {voteModalOpen && proposalId && details && (
        <VoteModal
          proposalId={proposalId}
          startBlock={details.startBlock}
          open={voteModalOpen}
          onClose={() => setVoteModalOpen(false)}
        />
      )}
    </div>
  );
}
