import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useEnsName } from "wagmi";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useDelegate } from "@/modules/governance/hooks/useDelegate";
import { useProposals } from "@/modules/governance/hooks/useProposals";
import { DelegateVotingModal } from "@/modules/governance/components/delegate-voting-modal";
import { Copy, Check, ArrowRight } from "lucide-react";
import { mainnet } from "@/lib/chains";

function truncateAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

const VOTE_SUPPORT_LABELS: Record<number, string> = {
  0: "Against",
  1: "For",
  2: "Abstain",
};

const VOTE_SUPPORT_COLORS: Record<number, string> = {
  0: "bg-red-500/20 text-red-400",
  1: "bg-green-500/20 text-green-400",
  2: "bg-gray-500/20 text-gray-400",
};

/**
 * Delegate detail page at /dao/delegate/:id.
 * Shows delegate info, voting power stats, and voting history.
 */
export function DelegateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: delegate, isLoading } = useDelegate({ id: id ?? "" });
  const { data: proposals } = useProposals();
  const [copied, setCopied] = useState(false);
  const [delegateModalOpen, setDelegateModalOpen] = useState(false);

  const { data: ensName } = useEnsName({
    address: id as `0x${string}` | undefined,
    chainId: mainnet.id,
  });

  const displayName = ensName ?? (id ? truncateAddress(id) : "...");

  const votingPower = delegate
    ? Number(delegate.latestVotingPowerSnapshot.votingPower).toFixed(4)
    : "0";

  const voteCount = delegate?.votesCasted?.length ?? 0;
  const delegationCount = delegate?.delegators?.length ?? 0;

  // Map proposal IDs to titles for the voting history
  const proposalTitleMap = useMemo(() => {
    if (!proposals) return new Map<string, string>();
    return new Map(proposals.map((p) => [String(p.details.id), p.title]));
  }, [proposals]);

  const handleCopy = () => {
    if (id) {
      navigator.clipboard.writeText(id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl">
        <Card className="p-12">
          <div className="flex items-center justify-center text-secondary-t">
            Loading delegate...
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-secondary-t">
        <Link to="/dao/delegate" className="hover:text-primary-t transition-colors">
          Delegates
        </Link>
        <span>/</span>
        <span className="text-primary-t">{displayName}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{displayName}</h1>
          {id && (
            <button
              type="button"
              onClick={handleCopy}
              className="mt-1 flex items-center gap-1.5 text-sm text-secondary-t hover:text-primary-t transition-colors"
            >
              <span className="font-mono">{id}</span>
              {copied ? (
                <Check className="h-3.5 w-3.5 text-green-400" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
          )}
        </div>
        <Button onClick={() => setDelegateModalOpen(true)}>Delegate Voting Power</Button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-sm text-secondary-t">Voting Power</p>
          <p className="text-2xl font-bold mt-1">{votingPower} gOHM</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-secondary-t">Vote Participation</p>
          <p className="text-2xl font-bold mt-1">{voteCount}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-secondary-t">Received Delegations</p>
          <p className="text-2xl font-bold mt-1">{delegationCount}</p>
        </Card>
      </div>

      {/* Voting History */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Voting History</h2>
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-a5-b text-left text-sm text-secondary-t">
                  <th className="px-4 py-3 font-medium">Proposal</th>
                  <th className="px-4 py-3 font-medium">Vote</th>
                  <th className="px-4 py-3 font-medium text-right">Details</th>
                </tr>
              </thead>
              <tbody>
                {!delegate?.votesCasted || delegate.votesCasted.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-12 text-center text-secondary-t text-sm">
                      No votes cast yet
                    </td>
                  </tr>
                ) : (
                  delegate.votesCasted.map((vote) => {
                    const proposalTitle =
                      proposalTitleMap.get(vote.proposalId) ?? `Proposal #${vote.proposalId}`;
                    const supportLabel = VOTE_SUPPORT_LABELS[vote.support] ?? "Unknown";
                    const supportColor =
                      VOTE_SUPPORT_COLORS[vote.support] ?? "bg-gray-500/20 text-gray-400";

                    return (
                      <tr
                        key={vote.proposalId}
                        className="border-b border-a3-b last:border-0 hover:bg-surface-a3 transition-colors"
                      >
                        <td className="px-4 py-3 text-sm">{proposalTitle}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${supportColor}`}
                          >
                            {supportLabel}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            to={`/dao/vote/${vote.proposalId}`}
                            className="inline-flex items-center gap-1 text-sm text-secondary-t hover:text-primary-t transition-colors"
                          >
                            View Proposal
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {delegateModalOpen && (
        <DelegateVotingModal open={delegateModalOpen} onClose={() => setDelegateModalOpen(false)} />
      )}
    </div>
  );
}
