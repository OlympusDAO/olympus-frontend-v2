import { InfoIcon } from "lucide-react";

export const InsufficientReceiptTokens = ({ tokenName }: { tokenName: string }) => {
  return (
    <div className="bg-blue/10 rounded-3xl p-4 border border-blue/5">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <InfoIcon className="h-4 w-4 text-blue" />
        </div>
        <div className="space-y-2">
          <div className="font-medium text-sm">Not Enough Receipt Tokens</div>
          <div className="text-sm text-secondary-t font-light leading-relaxed">
            Conversion requires {tokenName} receipt tokens to burn.
            <span className="ml-1">
              You don't have enough receipt tokens to cover your entire CD position. Mint more
              receipt tokens to unlock all your available capacity.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
