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
import { RiThumbUpFill, RiThumbDownFill, RiEyeCloseFill } from "@remixicon/react";
import { GOHMTokenIcon } from "@/icons";
import { cn } from "@/lib/utils";
import { abbreviateNumber } from "@/modules/governance/helpers/format";

const VOTE_OPTIONS = [
  { value: "1", label: "For", color: "text-green", icon: RiThumbUpFill },
  { value: "0", label: "Against", color: "text-red", icon: RiThumbDownFill },
  { value: "2", label: "Abstain", color: "text-primary-t", icon: RiEyeCloseFill },
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
      vote: Number(selectedVote) as 0 | 1 | 2,
      comment: comment.trim() || undefined,
    });
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) handleClose();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[480px] p-6 rounded-3xl gap-6">
        <DialogHeader className="gap-0">
          <DialogTitle className="text-[20px]/[24px] font-semibold text-primary-t">
            Cast Your Vote
          </DialogTitle>
          <DialogDescription className="sr-only">
            Select your vote and optionally provide a reason.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between">
          <span className="text-sm/5 text-secondary-t">My Voting Power</span>
          <div className="flex items-center gap-2">
            <GOHMTokenIcon className="size-5" />
            <span className="text-sm/5 font-semibold text-primary-t">
              {weightLoading ? "..." : `${abbreviateNumber(votingPower)} gOHM`}
            </span>
          </div>
        </div>

        {!hasVotingPower && !weightLoading && (
          <div className="rounded-lg bg-red/10 px-3 py-2 text-xs text-red">
            You have no voting power for this proposal.
          </div>
        )}

        <RadioGroup
          value={selectedVote}
          onValueChange={(value) => setSelectedVote(value as string)}
          disabled={!hasVotingPower}
          className="gap-2"
        >
          {VOTE_OPTIONS.map((option) => {
            const Icon = option.icon;
            const isSelected = selectedVote === option.value;
            return (
              <label
                htmlFor={`vote-${option.value}`}
                key={option.value}
                className={cn(
                  "flex items-center justify-between rounded-xl border p-4 cursor-pointer transition-colors",
                  isSelected ? "border-primary-t" : "border-a10-b hover:bg-surface-a3",
                )}
              >
                <div className="flex items-center gap-2">
                  <Icon className={cn("size-5", option.color)} />
                  <span className={cn("text-sm/5 font-semibold", option.color)}>
                    {option.label}
                  </span>
                </div>
                <RadioGroupItem
                  value={option.value}
                  id={`vote-${option.value}`}
                  className="self-center"
                />
              </label>
            );
          })}
        </RadioGroup>

        <textarea
          id="comment"
          className="w-full rounded-lg border border-a3-b bg-surface-a3 px-3 py-2.5 text-sm/5 text-primary-t placeholder:text-tertiary-t outline-none resize-none h-20"
          placeholder="Why are you voting this way? (optional)"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          disabled={!hasVotingPower}
        />

        {isSuccess ? (
          <div className="rounded-lg bg-green/10 px-3 py-2 text-xs text-green text-center">
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
      </DialogContent>
    </Dialog>
  );
}
