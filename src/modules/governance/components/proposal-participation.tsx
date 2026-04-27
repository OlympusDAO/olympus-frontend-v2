import { TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useProposalVotes, type VoteCast } from "@/modules/governance/hooks/useProposalVotes";
import { abbreviateNumber } from "@/modules/governance/helpers/format";
import { shortenAddress } from "@/lib/helpers";
import { RiThumbUpLine, RiThumbDownLine, RiEyeCloseLine } from "@remixicon/react";

function VoteTableBody({
  votes,
  isLoading,
}: {
  votes: VoteCast[] | undefined;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-2 p-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (!votes || votes.length === 0) {
    return <div className="p-6 text-center text-sm text-tertiary-t">No votes recorded.</div>;
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full caption-bottom">
        <TableBody>
          {votes.map((vote) => (
            <TableRow key={vote.transactionHash}>
              <TableCell>
                <a
                  href={`https://etherscan.io/address/${vote.voter.address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm/5 font-semibold text-primary-t hover:text-secondary-t"
                >
                  {shortenAddress(vote.voter.address as `0x${string}`)}
                </a>
              </TableCell>
              <TableCell className="text-right">
                <span className="text-sm/5 font-semibold text-primary-t">
                  {abbreviateNumber(Number(vote.votes))} gOHM
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </table>
    </div>
  );
}

/**
 * Full-width table of individual vote records with For/Against/Abstain pill tabs
 * rendered above the column titles inside the same rounded table container.
 */
export function ProposalParticipation({ proposalId }: { proposalId: string }) {
  const { data: forVotes, isLoading: forLoading } = useProposalVotes({
    proposalId,
    support: 1,
  });
  const { data: againstVotes, isLoading: againstLoading } = useProposalVotes({
    proposalId,
    support: 0,
  });
  const { data: abstainVotes, isLoading: abstainLoading } = useProposalVotes({
    proposalId,
    support: 2,
  });

  return (
    <div
      data-slot="proposal-participation"
      className="rounded-3xl border border-a5-b bg-surface-bg-l2 shadow-surface-level-2 overflow-hidden"
    >
      <Tabs defaultValue="for">
        <div className="bg-surface-a3">
          <div className="p-4">
            <TabsList className="w-full [&>[data-slot=tabs-trigger]]:flex-1">
              <TabsTrigger value="for" className="w-full text-sm/5">
                <RiThumbUpLine />
                <span>For {forVotes ? `(${forVotes.length})` : ""}</span>
              </TabsTrigger>
              <TabsTrigger value="against" className="w-full text-sm/5">
                <RiThumbDownLine />
                <span>Against {againstVotes ? `(${againstVotes.length})` : ""}</span>
              </TabsTrigger>
              <TabsTrigger value="abstain" className="w-full text-sm/5">
                <RiEyeCloseLine />
                <span>Abstain {abstainVotes ? `(${abstainVotes.length})` : ""}</span>
              </TabsTrigger>
            </TabsList>
          </div>
          <div className="flex items-center h-10 px-6 text-xs text-secondary-t">
            <span className="flex-1">Address</span>
            <span className="text-right">Votes</span>
          </div>
        </div>
        <TabsContent value="for">
          <VoteTableBody votes={forVotes} isLoading={forLoading} />
        </TabsContent>
        <TabsContent value="against">
          <VoteTableBody votes={againstVotes} isLoading={againstLoading} />
        </TabsContent>
        <TabsContent value="abstain">
          <VoteTableBody votes={abstainVotes} isLoading={abstainLoading} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
