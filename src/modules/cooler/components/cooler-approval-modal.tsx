import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckIcon, Loader2, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { blockExplorerTxBaseUrl } from "@/lib/helpers";

interface Step {
  number: number;
  title: string;
  detail?: string;
  isActive: boolean;
  isCompleted: boolean;
  isLoading: boolean;
  hash?: `0x${string}`;
}

interface CoolerApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  steps: Step[];
  currentStep: number;
  totalSteps: number;
  isAllComplete: boolean;
  isPending: boolean;
  onAction: () => void;
  actionLabel: string;
}

function formatTxHash(hash: `0x${string}`) {
  return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
}

export function CoolerApprovalModal({
  isOpen,
  onClose,
  title,
  steps,
  currentStep,
  totalSteps,
  isAllComplete,
  isPending,
  onAction,
  actionLabel,
}: CoolerApprovalModalProps) {
  if (isAllComplete) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="w-full sm:max-w-md mx-auto p-6 gap-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-green/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckIcon className="h-8 w-8 text-green" />
            </div>
            <DialogTitle className="text-xl font-semibold mb-2">All done!</DialogTitle>
            <p className="text-sm text-secondary-t mb-6">Your transactions have been executed.</p>
          </div>

          <div className="space-y-3">
            {steps.map((step) => (
              <div key={step.number} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-green/20 flex items-center justify-center">
                    <CheckIcon className="h-4 w-4 text-green" />
                  </div>
                  <div>
                    <div className="font-medium text-sm">{step.title}</div>
                    {step.detail && <div className="text-xs text-secondary-t">{step.detail}</div>}
                  </div>
                </div>
                {step.hash && (
                  <Link
                    target="_blank"
                    to={`${blockExplorerTxBaseUrl}/${step.hash}`}
                    className="flex items-center gap-1 text-sm text-blue hover:text-blue-800"
                  >
                    {formatTxHash(step.hash)}
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                )}
              </div>
            ))}
          </div>

          <Button onClick={onClose} className="w-full" size="lg">
            Close
          </Button>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full sm:max-w-md mx-auto p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 text-center">
          <DialogTitle className="text-xl">{title}</DialogTitle>
          <p className="text-sm text-secondary-t font-light">
            Step {currentStep}/{totalSteps}. Proceed with your wallet.
          </p>
        </DialogHeader>

        <div className="px-6 pb-6">
          <div className="bg-surface-a3 border border-a3-b rounded-3xl">
            {steps.map((step, index) => (
              <div key={step.number}>
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-6 h-6 rounded-full ring-3 flex items-center justify-center text-sm font-medium ${
                        step.isCompleted
                          ? "text-green"
                          : step.isActive
                            ? "text-primary-t"
                            : "text-secondary-t ring-a10-b"
                      }`}
                    >
                      {step.isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : step.isCompleted ? (
                        <CheckIcon className="h-4 w-4" />
                      ) : (
                        step.number
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-sm">{step.title}</div>
                      {step.detail && (
                        <div className="text-xs text-secondary-t rounded-full border px-2 py-1 text-center border-a10-b">
                          {step.detail}
                        </div>
                      )}
                      {step.isCompleted && step.hash && (
                        <Link
                          target="_blank"
                          to={`${blockExplorerTxBaseUrl}/${step.hash}`}
                          className="flex items-center gap-1 text-xs text-blue hover:text-blue-800 mt-1"
                        >
                          {formatTxHash(step.hash)}
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
                {index < steps.length - 1 && <div className="border-b border-a5-b mx-4" />}
              </div>
            ))}
          </div>

          <div className="mt-6">
            <Button
              onClick={onAction}
              disabled={isPending}
              className="w-full"
              size="lg"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                actionLabel
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
