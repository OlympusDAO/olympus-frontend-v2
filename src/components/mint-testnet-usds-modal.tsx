import { useState } from "react";
import { useAccount, useChainId, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits } from "viem";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { requireTokenAddress } from "@/lib/tokens";
import { useTransactionToast, TransactionToastConfig } from "@/lib/hooks/useTransactionToast";
import MockERC20Abi from "@/abis/MockERC20";

interface MintTestnetUsdsModalProps {
  trigger: React.ReactNode;
}

export function MintTestnetUsdsModal({ trigger }: MintTestnetUsdsModalProps) {
  const [amount, setAmount] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const { address } = useAccount();
  const chainId = useChainId();

  const {
    data: hash,
    writeContract,
    isPending: isWritePending,
    error: writeError,
    reset: resetWrite,
  } = useWriteContract();

  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    error: confirmError,
  } = useWaitForTransactionReceipt({
    hash,
    confirmations: 1,
  });

  // Toast configuration for minting transactions
  const toastConfig: TransactionToastConfig = {
    pending: {
      title: "Minting testnet USDS...",
      description: "Please wait while your transaction is confirmed.",
    },
    success: {
      title: "USDS minted successfully!",
      description: `${amount} testnet USDS has been minted to your wallet.`,
    },
    error: {
      title: "Minting failed",
      description: "There was an error minting testnet USDS. Please try again.",
      userRejected: {
        title: "Transaction cancelled",
        description: "You cancelled the minting transaction.",
      },
      insufficientFunds: {
        title: "Insufficient funds",
        description: "You don't have enough ETH for gas fees.",
      },
    },
  };

  // Handle toast notifications
  const { reset: resetToast } = useTransactionToast({
    hash,
    isWritePending,
    isConfirmed,
    writeError,
    confirmError,
    config: toastConfig,
  });

  const handleMint = () => {
    if (!address || !amount) return;

    const usdsAddress = requireTokenAddress("USDS", chainId);
    const amountBigInt = parseUnits(amount, 18);

    // Reset states for new transaction
    resetWrite();
    resetToast();

    writeContract({
      address: usdsAddress,
      abi: MockERC20Abi,
      functionName: "mint",
      args: [address, amountBigInt],
    }, {
      onSuccess: () => {
        setAmount("");
        setIsOpen(false);
      },
    });
  };

  const isPending = isWritePending || isConfirming;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mint Testnet USDS</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Amount</label>
            <Input
              type="number"
              placeholder="Enter amount to mint"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <Button
            onClick={handleMint}
            disabled={!address || !amount || isPending}
            className="w-full"
          >
            {isPending ? "Minting..." : "Mint USDS"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}