import { useState, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useEnsName, useBlockNumber, useAccount, useChainId } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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
import { shortenAddress } from "@/lib/helpers";

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

  const proposerAddress = details?.proposer || proposal?.details.proposer;

  const { data: ensName } = useEnsName({
    address: proposerAddress as `0x${string}` | undefined,
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
    if (proposerAddress) return shortenAddress(proposerAddress as `0x${string}`);
    return "...";
  }, [ensName, proposerAddress]);

  const currentTimestamp = Math.floor(Date.now() / 1000);
  const { data: currentBlock } = useBlockNumber({ chainId: mainnet.id });
  const { isConnected } = useAccount();
  const walletChainId = useChainId();
  const isWrongNetwork = isConnected && walletChainId !== mainnet.id;

  // Action button logic based on proposal status
  const actionButton = useMemo(() => {
    if (!details || !proposalId) return null;

    // Resolve which lifecycle action (if any) is available in the current state.
    // Only show Activate once the voting delay has elapsed (current block has reached
    // startBlock); activate() reverts before then. Matches v1 governance behavior.
    let action: {
      label: string;
      pendingLabel: string;
      isPending: boolean;
      run: () => void;
    } | null = null;

    if (
      details.status === "Pending" &&
      currentBlock !== undefined &&
      Number(currentBlock) >= details.startBlock
    ) {
      action = {
        label: "Activate Proposal",
        pendingLabel: "Activating...",
        isPending: isActivating,
        run: () => activate({ proposalId }),
      };
    } else if (details.status === "Succeeded") {
      action = {
        label: "Queue for Execution",
        pendingLabel: "Queueing...",
        isPending: isQueueing,
        run: () => queue({ proposalId }),
      };
    } else if (details.status === "Queued" && details.eta > 0 && currentTimestamp >= details.eta) {
      action = {
        label: "Execute Proposal",
        pendingLabel: "Executing...",
        isPending: isExecuting,
        run: () => execute({ proposalId }),
      };
    }

    if (!action) return null;

    // There's an action to take, but writes require a connected wallet on mainnet —
    // surface that affordance instead of a button that would silently prompt or revert.
    if (!isConnected || isWrongNetwork) {
      return (
        <ConnectButton.Custom>
          {({ openConnectModal, openChainModal }) =>
            isConnected ? (
              <Button variant="secondary" type="button" onClick={openChainModal}>
                Switch to Mainnet
              </Button>
            ) : (
              <Button type="button" onClick={openConnectModal}>
                Connect Wallet
              </Button>
            )
          }
        </ConnectButton.Custom>
      );
    }

    return (
      <Button onClick={action.run} disabled={action.isPending}>
        {action.isPending ? action.pendingLabel : action.label}
      </Button>
    );
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
    currentBlock,
    isConnected,
    isWrongNetwork,
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
    <div className="mx-auto max-w-7xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-[32px]/[40px] font-semibold text-primary-t">{proposal.title}</h1>
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            {details && <ProposalStatusBadge status={details.status} />}
            <div className="flex items-center gap-1.5 text-sm/5 font-normal text-secondary-t flex-wrap">
              <span>By:</span>
              {proposerAddress && (
                <a
                  href={`https://etherscan.io/address/${proposerAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-primary-t hover:underline"
                >
                  {proposerDisplay}
                </a>
              )}
              <span>·</span>
              <span>
                ID: <span className="font-semibold text-primary-t">{proposal.details.id}</span>
              </span>
              <span>·</span>
              <span>Proposed on: {createdDate}</span>
            </div>
          </div>
        </div>
        {actionButton}
      </div>

      {/* Divider */}
      <Separator className="my-8" />

      {/* Main content: tabs + sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Tabs variant="primary" value={activeTab} onValueChange={setActiveTab}>
            <TabsList variant="primary">
              <TabsTrigger variant="primary" value="description">
                Description
              </TabsTrigger>
              <TabsTrigger variant="primary" value="executable-code">
                Executable Code
              </TabsTrigger>
              <TabsTrigger variant="primary" value="participation">
                Participation
              </TabsTrigger>
            </TabsList>
            <TabsContent value="description">
              <Card className="p-6">
                <ProposalDescription content={proposal.details.description} />
              </Card>
            </TabsContent>
            <TabsContent value="executable-code">
              <Card className="p-6">
                <ProposalCalldata
                  targets={proposal.details.targets}
                  signatures={proposal.details.signatures}
                  calldatas={proposal.details.calldatas}
                  values={proposal.details.values}
                />
              </Card>
            </TabsContent>
            <TabsContent value="participation">
              <ProposalParticipation proposalId={String(proposal.details.id)} />
            </TabsContent>
          </Tabs>
        </div>

        <div className="flex flex-col gap-3">
          <h2 className="text-[20px]/[24px] font-semibold text-primary-t">Vote</h2>
          {details && (
            <VoteSidebar
              proposalId={proposal.details.id}
              startBlock={details.startBlock}
              status={details.status}
              publishedDate={proposal.createdAtBlock}
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
