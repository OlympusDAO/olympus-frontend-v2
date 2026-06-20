import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CheckIcon, ExternalLink, Loader2 } from "lucide-react";
import { formatUnits, parseUnits } from "viem";
import { useAccount, useChainId, useReadContract } from "wagmi";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TokenBigInput } from "@/components/ui/token-big-input";
import { useToken } from "@/lib/hooks/useToken";
import { useUnwrapWsohm } from "@/lib/hooks/useUnwrapWsohm";
import { ContractName, getContractAddress } from "@/lib/contracts";
import { TokenName } from "@/lib/tokens";
import { blockExplorerTxBaseUrl } from "@/lib/helpers";
import WsOHMAbi from "@/abis/WsOHM";

interface UnwrapWsohmModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const WSOHM_DECIMALS = 18;
const SOHM_DECIMALS = 9;

function formatTxHash(hash?: `0x${string}`) {
  return hash ? `${hash.slice(0, 6)}...${hash.slice(-4)}` : "";
}

export function UnwrapWsohmModal({ isOpen, onClose }: UnwrapWsohmModalProps) {
  const { address } = useAccount();
  const chainId = useChainId();
  const [amount, setAmount] = useState("");

  const wsohmAddress = getContractAddress(ContractName.WSOHM, chainId);

  const wsohmToken = useToken(TokenName.WSOHM, address);
  const gohmToken = useToken(TokenName.GOHM);
  // wsOHM has no direct price feed; it tracks gOHM, so display value using the gOHM price.
  const inputToken = useMemo(
    () => ({ ...wsohmToken, price: gohmToken.price }),
    [wsohmToken, gohmToken.price],
  );

  const balance = wsohmToken.balance ?? 0n;

  const amountBigInt = useMemo(() => {
    if (!amount) return 0n;
    try {
      return parseUnits(amount, WSOHM_DECIMALS);
    } catch {
      return 0n;
    }
  }, [amount]);

  // Preview sOHM v1 received (not 1:1 — scaled by the gOHM index).
  const { data: sohmOut } = useReadContract({
    address: wsohmAddress,
    abi: WsOHMAbi,
    functionName: "wOHMTosOHM",
    args: [amountBigInt],
    query: { enabled: !!wsohmAddress && amountBigInt > 0n },
  });
  const receiveAmount =
    sohmOut !== undefined
      ? Number(formatUnits(sohmOut, SOHM_DECIMALS)).toLocaleString("en-US", {
          maximumFractionDigits: 4,
        })
      : "0";

  const {
    unwrap,
    isPending: isUnwrapping,
    isSuccess: unwrapSuccess,
    hash: unwrapHash,
    reset: resetUnwrap,
  } = useUnwrapWsohm();

  const buttonState = useMemo(() => {
    if (!address) return { disabled: true, label: "Connect Wallet" };
    if (!amount || amountBigInt === 0n) return { disabled: true, label: "Enter Amount" };
    if (amountBigInt > balance) return { disabled: true, label: "Insufficient wsOHM Balance" };
    return { disabled: false, label: "Unwrap to sOHM v1" };
  }, [address, amount, amountBigInt, balance]);

  const handleMax = () => setAmount(formatUnits(balance, WSOHM_DECIMALS));
  const handleUnwrap = () => unwrap({ amount: amountBigInt });
  const handleClose = () => onClose();

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset fn is stable enough; only re-run on open/close
  useEffect(() => {
    if (!isOpen) {
      setAmount("");
      resetUnwrap();
    }
  }, [isOpen]);

  // Success state.
  if (unwrapSuccess) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="w-full sm:max-w-md mx-auto p-6 gap-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-green/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckIcon className="h-8 w-8 text-green" />
            </div>
            <DialogTitle className="text-xl font-semibold mb-2">Unwrapped to sOHM v1</DialogTitle>
            <p className="text-sm text-secondary-t mb-2">
              Next, unstake your sOHM v1 to OHM v1, then migrate.
            </p>
            {unwrapHash && (
              <Link
                target="_blank"
                to={`${blockExplorerTxBaseUrl}${unwrapHash}`}
                className="inline-flex items-center gap-1 text-sm text-blue hover:text-blue-800"
              >
                {formatTxHash(unwrapHash)}
                <ExternalLink className="h-3 w-3" />
              </Link>
            )}
          </div>
          <Button onClick={handleClose} className="w-full">
            Close
          </Button>
        </DialogContent>
      </Dialog>
    );
  }

  // Input phase (single transaction — no approval needed for unwrap).
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-full sm:max-w-md mx-auto p-6 gap-4">
        <DialogHeader className="text-center !gap-2">
          <DialogTitle className="text-[20px]/[24px] font-semibold text-primary-t">
            Unwrap wsOHM
          </DialogTitle>
          <p className="text-xs/4 font-normal text-secondary-t">
            Unwrap wsOHM to sOHM v1 — then unstake it to OHM v1 to migrate.
          </p>
        </DialogHeader>

        <TokenBigInput
          label="Unwrap"
          token={inputToken}
          value={amount}
          onChange={(val) => setAmount(val)}
          onMax={handleMax}
        />

        <div className="flex justify-between text-sm px-1">
          <span className="text-secondary-t">You receive</span>
          <span className="font-semibold text-primary-t">≈ {receiveAmount} sOHM v1</span>
        </div>

        <Button
          onClick={handleUnwrap}
          disabled={buttonState.disabled || isUnwrapping}
          className="w-full"
        >
          {isUnwrapping ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Confirming Unwrap In Your Wallet
            </>
          ) : (
            buttonState.label
          )}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
