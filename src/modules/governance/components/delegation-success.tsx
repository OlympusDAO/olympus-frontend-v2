import { CheckCircle2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Success state shown after a successful delegation transaction.
 * Shows a green checkmark, confirmation message, and a link to the transaction.
 */
export function DelegationSuccess({
  txHash,
  amount,
  onClose,
}: {
  txHash: string;
  amount: string;
  onClose: () => void;
}) {
  return (
    <div
      data-slot="delegation-success"
      className="flex flex-col items-center gap-4 py-4 text-center"
    >
      <CheckCircle2 className="size-12 text-green-500" />

      <div className="flex flex-col gap-1">
        <h3 className="text-lg font-semibold text-primary-t">Congrats, all done!</h3>
        <p className="text-sm text-secondary-t">You have successfully delegated {amount} gOHM.</p>
      </div>

      <a
        href={`https://etherscan.io/tx/${txHash}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors"
      >
        View transaction
        <ExternalLink className="size-3" />
      </a>

      <Button variant="secondary" onClick={onClose} className="w-full mt-2">
        Close
      </Button>
    </div>
  );
}
