import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useProposalVotes, type VoteCast } from "@/modules/governance/hooks/useProposalVotes";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const voteBadgeVariants = cva(
  "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
  {
    variants: {
      support: {
        for: "bg-green-500/20 text-green-400",
        against: "bg-red-500/20 text-red-400",
        abstain: "bg-gray-500/20 text-gray-400",
      },
    },
  },
);

function getSupport(support: number): "for" | "against" | "abstain" {
  if (support === 1) return "for";
  if (support === 0) return "against";
  return "abstain";
}

function getSupportLabel(support: number): string {
  if (support === 1) return "For";
  if (support === 0) return "Against";
  return "Abstain";
}

function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function VoteTable({ votes, isLoading }: { votes: VoteCast[] | undefined; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-2 p-4">
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
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Address</TableHead>
          <TableHead>Vote</TableHead>
          <TableHead>Weight</TableHead>
          <TableHead>Reason</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {votes.map((vote) => (
          <TableRow key={vote.transactionHash}>
            <TableCell>
              <a
                href={`https://etherscan.io/address/${vote.voter.address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-xs text-blue-400 hover:text-blue-300"
              >
                {shortenAddress(vote.voter.address)}
              </a>
            </TableCell>
            <TableCell>
              <span className={cn(voteBadgeVariants({ support: getSupport(vote.support) }))}>
                {getSupportLabel(vote.support)}
              </span>
            </TableCell>
            <TableCell>
              <span className="text-xs text-primary-t">
                {Number(vote.votes).toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                })}{" "}
                gOHM
              </span>
            </TableCell>
            <TableCell>
              <span className="text-xs text-secondary-t line-clamp-2 max-w-[200px]">
                {vote.reason || "--"}
              </span>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/**
 * Tabbed table showing individual vote records (For, Against, Abstain) for a proposal.
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
    <div data-slot="proposal-participation">
      <Tabs defaultValue="for">
        <TabsList>
          <TabsTrigger value="for">For {forVotes ? `(${forVotes.length})` : ""}</TabsTrigger>
          <TabsTrigger value="against">
            Against {againstVotes ? `(${againstVotes.length})` : ""}
          </TabsTrigger>
          <TabsTrigger value="abstain">
            Abstain {abstainVotes ? `(${abstainVotes.length})` : ""}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="for">
          <VoteTable votes={forVotes} isLoading={forLoading} />
        </TabsContent>
        <TabsContent value="against">
          <VoteTable votes={againstVotes} isLoading={againstLoading} />
        </TabsContent>
        <TabsContent value="abstain">
          <VoteTable votes={abstainVotes} isLoading={abstainLoading} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
