import { useState } from "react";
import { useAccount } from "wagmi";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useVotingWeight } from "@/modules/governance/hooks/useVotingWeight";
import { useVote } from "@/modules/governance/hooks/useVote";

const VOTE_OPTIONS = [
  { value: "1", label: "For", color: "text-green-400" },
  { value: "0", label: "Against", color: "text-red-400" },
  { value: "2", label: "Abstain", color: "text-secondary-t" },
] as const;

/**
 * Modal dialog for casting a vote on a governance proposal.
 * Shows voting power, vote type selection, optional comment, and cast vote button.
 */
export function VoteModal({
  open,
  onClose,
  proposalId,
  startBlock,
}: {
  open: boolean;
  onClose: () => void;
  proposalId: number;
  startBlock: number;
}) {
  const { isConnected } = useAccount();
  const { data: votingWeight, isLoading: weightLoading } = useVotingWeight({ startBlock });
  const { castVote, isPending, isSuccess, reset } = useVote();

  const [selectedVote, setSelectedVote] = useState<string>("");
  const [comment, setComment] = useState("");

  const votingPower = votingWeight ? Number(votingWeight) : 0;
  const hasVotingPower = votingPower > 0;

  function handleClose() {
    setSelectedVote("");
    setComment("");
    reset();
    onClose();
  }

  function handleCastVote() {
    if (!selectedVote) return;
    castVote({
      proposalId,
      vote: Number(selectedVote),
      comment: comment.trim() || undefined,
    });
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) handleClose();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cast Your Vote</DialogTitle>
          <DialogDescription>Select your vote and optionally provide a reason.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* Voting Power */}
          <div className="flex items-center justify-between rounded-lg bg-surface-a3 px-3 py-2.5">
            <span className="text-xs text-secondary-t">My Voting Power</span>
            <span className="text-sm font-semibold text-primary-t">
              {weightLoading
                ? "..."
                : `${votingPower.toLocaleString(undefined, { maximumFractionDigits: 4 })} gOHM`}
            </span>
          </div>

          {!hasVotingPower && !weightLoading && (
            <div className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">
              You have no voting power for this proposal.
            </div>
          )}

          {/* Vote Selection */}
          <RadioGroup
            value={selectedVote}
            onValueChange={(value) => setSelectedVote(value as string)}
            disabled={!hasVotingPower}
          >
            {VOTE_OPTIONS.map((option) => (
              <label
                htmlFor={`vote-${option.value}`}
                key={option.value}
                className="flex items-center gap-3 rounded-lg border border-a5-b px-3 py-2.5 cursor-pointer hover:bg-surface-a3 transition-colors"
              >
                <RadioGroupItem value={option.value} id={`vote-${option.value}`} />
                <span className={`text-sm font-medium ${option.color}`}>{option.label}</span>
              </label>
            ))}
          </RadioGroup>

          {/* Comment */}
          {selectedVote && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-secondary-t" htmlFor="comment">
                Reason (optional)
              </label>
              <textarea
                id="comment"
                className="w-full rounded-lg border border-a10-b bg-transparent px-3 py-2 text-sm text-primary-t placeholder:text-tertiary-t outline-none resize-none min-h-[80px]"
                placeholder="Add a comment for your vote..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>
          )}

          {isSuccess ? (
            <div className="rounded-lg bg-green-500/10 px-3 py-2 text-xs text-green-400 text-center">
              Vote cast successfully!
            </div>
          ) : (
            <Button
              onClick={handleCastVote}
              disabled={!selectedVote || !hasVotingPower || isPending || !isConnected}
              className="w-full"
            >
              {isPending ? "Casting Vote..." : "Cast Vote"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
