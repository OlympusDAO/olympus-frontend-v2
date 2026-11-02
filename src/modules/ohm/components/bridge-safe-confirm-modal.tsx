import { ExternalLink, Info, Loader2 } from "lucide-react";
import { formatUnits, type Address } from "viem";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { Button } from "@/components/ui/button.tsx";
import { ChainIcon } from "@/components/chain-icon.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import { ContractName, getContractAddress } from "@/lib/contracts.ts";
import { shortenAddress } from "@/lib/helpers.ts";
import { getSafeFee } from "@/lib/hooks/bridge/safeFee";
import { getSafeQueueUrl } from "@/lib/hooks/bridge/safeService";
import { useBridgeLimits } from "@/lib/hooks/bridge/useBridgeLimits";
import { useBridgeRoute } from "@/lib/hooks/bridge/useBridgeRoute";
import { useEstimateBridgeFee } from "@/lib/hooks/bridge/useEstimateBridgeFee";
import { useNativePrice } from "@/lib/hooks/bridge/useNativePrice";
import { useSafeBridge } from "@/lib/hooks/bridge/useSafeBridge";
import { useSafeTransferStatus } from "@/lib/hooks/bridge/useSafeTransferStatus";
import { useTokenAllowance } from "@/lib/hooks/useTokenAllowance.tsx";
import { getTokenAddress, TokenName } from "@/lib/tokens.ts";
import { getConfirmBlock, parseOhmAmount } from "../utils/bridgeCta.ts";
import { getBridgeChain } from "../utils/constants.ts";

function formatNative(wei: bigint, symbol: string, usdPrice?: number): string {
  const amount = Number(formatUnits(wei, 18));
  const native = `${amount.toLocaleString("en-US", { maximumFractionDigits: 6 })} ${symbol}`;
  return usdPrice === undefined ? native : `${native} ($${(amount * usdPrice).toFixed(2)})`;
}

interface BridgeSafeConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceChainId: number;
  destinationChainId: number;
  amount: string;
  recipientAddress: Address;
}

/** Proposes a bridge from a Safe, and shows what signing later can cost before anyone signs. */
export function BridgeSafeConfirmModal({
  isOpen,
  onClose,
  sourceChainId,
  destinationChainId,
  amount,
  recipientAddress,
}: BridgeSafeConfirmModalProps) {
  const { address } = useAccount();
  const walletChainId = useChainId();
  const { switchChain } = useSwitchChain();
  const sourceChain = getBridgeChain(sourceChainId);
  const destChain = getBridgeChain(destinationChainId);
  const symbol = sourceChain?.nativeCurrencySymbol ?? "ETH";
  const amountBigInt = parseOhmAmount(amount);

  const route = useBridgeRoute(sourceChainId, destinationChainId);
  const { status: amountStatus } = useBridgeLimits(sourceChainId, destinationChainId, amountBigInt);
  const { nativeFee } = useEstimateBridgeFee({
    sourceChainId,
    destinationChainId,
    recipientAddress,
    amount: amountBigInt,
  });
  const price = useNativePrice(symbol);
  const { allowance } = useTokenAllowance(
    getTokenAddress(TokenName.OHM, sourceChainId) as Address,
    address,
    getContractAddress(ContractName.CCIP_BRIDGE, sourceChainId),
    sourceChainId,
  );

  const { propose, safeTxHash, isProposed, isPending, error } = useSafeBridge();
  const { confirmations, required, isExecuted, isSuccessful } = useSafeTransferStatus(
    sourceChainId,
    safeTxHash,
  );

  const block = getConfirmBlock({
    walletChainId,
    source: { chainId: sourceChainId, name: sourceChain?.name ?? "", nativeCurrencySymbol: symbol },
    route,
    amountStatus,
  });

  const fee = nativeFee === undefined ? undefined : getSafeFee(nativeFee, destinationChainId);
  const queueUrl = address ? getSafeQueueUrl(sourceChainId, address) : undefined;
  const proposed = !!safeTxHash || isProposed;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full sm:max-w-md mx-auto p-0 gap-0 !rounded-3xl">
        <DialogHeader className="px-6 pt-6 pb-2 text-center !gap-6">
          <DialogTitle className="text-[20px]/[24px] font-semibold text-primary-t">
            Bridge OHM from your Safe
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 pb-6 space-y-4">
          <div className="flex items-center justify-center gap-3">
            <ChainIcon chainId={sourceChainId} size={24} />
            <span className="text-sm text-secondary-t">{sourceChain?.name}</span>
            <span className="text-secondary-t">→</span>
            <ChainIcon chainId={destinationChainId} size={24} />
            <span className="text-sm text-secondary-t">{destChain?.name}</span>
          </div>

          <dl className="bg-surface-a3 border border-a3-b rounded-3xl p-4 space-y-2 text-xs">
            <div className="flex justify-between">
              <dt className="text-secondary-t">Amount</dt>
              <dd className="font-medium text-primary-t">{amount} OHM</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-secondary-t">Recipient</dt>
              <dd className="font-medium text-primary-t">{shortenAddress(recipientAddress, 4)}</dd>
            </div>
            {nativeFee !== undefined && fee && (
              <>
                <div className="flex justify-between">
                  <dt className="text-secondary-t">Exact fee now</dt>
                  <dd className="font-medium text-primary-t">
                    {formatNative(nativeFee, symbol, price)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-secondary-t">Most you can overpay</dt>
                  <dd className="font-medium text-primary-t">
                    {formatNative(fee.maxOverpay, symbol, price)}
                  </dd>
                </div>
              </>
            )}
          </dl>

          <div className="flex items-start gap-2 bg-blue/10 border border-blue/20 rounded-xl p-3">
            <Info className="w-4 h-4 text-blue mt-0.5 shrink-0" />
            <p className="text-xs text-primary-t">
              The fee is paid when signers execute, so this includes a buffer in case it rises.
              Anything above the fee stays in the bridge and isn't refunded. If the fee rises past
              the buffer, execution reverts, no OHM moves, and you can propose again.
            </p>
          </div>

          {error && <p className="text-xs text-red">{error.message}</p>}

          {proposed ? (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-primary-t text-center">
                {isExecuted
                  ? isSuccessful
                    ? "Executed. Track delivery in your bridge history."
                    : "Execution reverted, propose again"
                  : confirmations !== undefined && required !== undefined
                    ? `Awaiting signatures (${confirmations} of ${required})`
                    : "Awaiting signatures"}
              </p>
              {queueUrl && (
                <a
                  href={queueUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-1 text-sm text-blue hover:text-blue-800"
                >
                  Open Safe queue
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
              <Button onClick={onClose} className="w-full">
                Close
              </Button>
            </div>
          ) : (
            <Button
              className="w-full"
              disabled={isPending || (block?.disabled ?? false) || !fee}
              onClick={() => {
                if (block?.action === "switch") {
                  switchChain({ chainId: sourceChainId });
                  return;
                }
                propose({
                  sourceChainId,
                  destinationChainId,
                  recipientAddress,
                  amount,
                  needsApproval: allowance === undefined || allowance < amountBigInt,
                });
              }}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Confirm in your Safe
                </>
              ) : (
                (block?.label ?? "Propose in Safe")
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
