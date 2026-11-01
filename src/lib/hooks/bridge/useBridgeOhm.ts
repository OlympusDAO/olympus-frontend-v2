import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useAccount, useConfig, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { getPublicClient } from "wagmi/actions";
import type { Address, Hex } from "viem";
import CCIPCrossChainBridgeAbi from "@/abis/CCIPCrossChainBridge";
import { ContractName, getContractAddress } from "@/lib/contracts";
import { CCIP_CHAIN_SELECTORS } from "@/modules/ohm/utils/constants";
import { useTransactionToast, type TransactionToastConfig } from "../useTransactionToast";
import { parseBridgedMessageId } from "./parseBridged";

const toastConfig: TransactionToastConfig = {
  pending: {
    title: "Bridging OHM...",
    description: "Please wait while your bridge transaction is confirmed.",
  },
  success: {
    title: "Bridge transaction submitted!",
    description: "Your OHM is on its way. Track its delivery in your bridge history.",
  },
  error: {
    title: "Bridge transaction failed",
    description: "There was an error bridging OHM. Please try again.",
    userRejected: {
      title: "Transaction cancelled",
      description: "You cancelled the bridge transaction.",
    },
    insufficientFunds: {
      title: "Insufficient funds",
      description: "You don't have enough native token for gas + bridge fees.",
    },
  },
};

export function useBridgeOhm() {
  const config = useConfig();
  const queryClient = useQueryClient();
  const queryKeyRef = useRef<readonly unknown[] | undefined>(undefined);
  const bridgeAddressRef = useRef<Address | undefined>(undefined);
  const { address } = useAccount();
  const [isQuoting, setIsQuoting] = useState(false);
  const [quoteError, setQuoteError] = useState<Error | null>(null);
  const [sourceChain, setSourceChain] = useState<number>();

  // A send that starts must not finish for a wallet that's no longer connected, or after the modal
  // has closed. The fee read leaves a gap where either can happen.
  const addressRef = useRef(address);
  addressRef.current = address;
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const {
    data: hash,
    writeContract,
    isPending: isWritePending,
    error: writeError,
    reset: resetWrite,
  } = useWriteContract();

  const {
    data: receipt,
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    error: confirmError,
  } = useWaitForTransactionReceipt({
    hash,
    confirmations: 1,
    // The wallet can change network while this waits.
    chainId: sourceChain,
  });

  const isReverted = receipt?.status === "reverted";
  const isSent = isConfirmed && !isReverted;
  const revertError = isReverted ? new Error("The bridge transaction reverted.") : null;

  useEffect(() => {
    if (isSent && queryKeyRef.current) {
      queryClient.invalidateQueries({ queryKey: queryKeyRef.current });
      queryKeyRef.current = undefined;
    }
  }, [isSent, queryClient]);

  const { reset: resetToast } = useTransactionToast({
    hash,
    isWritePending,
    isConfirmed: isSent,
    writeError: quoteError ?? writeError,
    confirmError: confirmError ?? revertError,
    config: toastConfig,
  });

  const bridge = async ({
    sourceChainId,
    destinationChainId,
    recipientAddress,
    amount,
    queryKey,
  }: {
    sourceChainId: number;
    destinationChainId: number;
    recipientAddress: Address;
    amount: bigint;
    queryKey?: readonly unknown[];
  }) => {
    const bridgeAddress = getContractAddress(ContractName.CCIP_BRIDGE, sourceChainId);
    const selector = CCIP_CHAIN_SELECTORS[destinationChainId];
    const client = getPublicClient(config, { chainId: sourceChainId });

    if (!address || !bridgeAddress || selector === undefined || !client) return;

    resetWrite();
    resetToast();
    setQuoteError(null);
    setSourceChain(sourceChainId);
    bridgeAddressRef.current = bridgeAddress;
    if (queryKey) queryKeyRef.current = queryKey;

    const args = [selector, recipientAddress, amount] as const;

    // The bridge keeps anything paid above the fee, and only its owner can withdraw it, so pay
    // exactly the latest quote rather than a possibly stale one from the form.
    let fee: bigint;
    setIsQuoting(true);
    try {
      fee = await client.readContract({
        address: bridgeAddress,
        abi: CCIPCrossChainBridgeAbi,
        functionName: "getFeeEVM",
        args,
      });
    } catch (error) {
      setQuoteError(error as Error);
      return;
    } finally {
      setIsQuoting(false);
    }

    if (!isMountedRef.current || addressRef.current !== address) return;

    writeContract({
      account: address,
      address: bridgeAddress,
      abi: CCIPCrossChainBridgeAbi,
      functionName: "sendToEVM",
      args,
      value: fee,
      chainId: sourceChainId,
    });
  };

  const reset = () => {
    resetWrite();
    resetToast();
    setQuoteError(null);
  };

  const messageId: Hex | undefined =
    receipt && bridgeAddressRef.current
      ? parseBridgedMessageId(receipt.logs, bridgeAddressRef.current)
      : undefined;

  return {
    bridge,
    isPending: isQuoting || isWritePending || isConfirming,
    isSuccess: isSent,
    error: quoteError || writeError || confirmError || revertError,
    hash,
    messageId,
    reset,
    isWritePending,
    isConfirming,
  };
}
