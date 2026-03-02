import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useWriteContract, useWaitForTransactionReceipt, useAccount, useChainId } from "wagmi";
import type { Address } from "viem";
import type { ContractFunctionArgs } from "viem";
import { useTransactionToast, type TransactionToastConfig } from "@/lib/hooks/useTransactionToast";
import { getContractAddress, ContractName } from "@/lib/contracts";
import { getTokenAddress } from "@/lib/tokens";
import ConvertibleDepositAuctioneerABI from "@/abis/ConvertibleDepositAuctioneer";

type BidArgs = ContractFunctionArgs<typeof ConvertibleDepositAuctioneerABI, "nonpayable", "bid">;

export function useBid() {
  const queryClient = useQueryClient();
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

  // Toast configuration for bid transactions
  const toastConfig: TransactionToastConfig = {
    pending: {
      title: "Submitting deposit...",
      description: "Please wait while your deposit is processed.",
    },
    success: {
      title: "Deposit successful!",
      description: "Your position has been created successfully.",
    },
    error: {
      title: "Deposit failed",
      description: "There was an error submitting your deposit. Please try again.",
      userRejected: {
        title: "Deposit cancelled",
        description: "You cancelled the transaction.",
      },
      insufficientFunds: {
        title: "Insufficient funds",
        description: "You don't have enough ETH for gas fees.",
      },
    },
  };

  // Handle toast notifications using the reusable hook
  const { reset: resetToast } = useTransactionToast({
    hash,
    isWritePending,
    isConfirmed,
    writeError,
    confirmError,
    config: toastConfig,
  });

  // Invalidate user positions queries when bid succeeds
  useEffect(() => {
    if (isConfirmed && address && chainId) {
      const positionManagerAddress = getContractAddress(
        ContractName.CONVERTIBLE_DEPOSIT_POSITION_MANAGER,
        chainId,
      );

      if (positionManagerAddress) {
        // Invalidate wagmi queries for user positions
        queryClient.invalidateQueries({
          queryKey: [
            "readContract",
            {
              address: positionManagerAddress,
              functionName: "getUserPositionIds",
              args: [address],
            },
          ],
        });

        // Also invalidate all getPosition queries for this contract
        queryClient.invalidateQueries({
          queryKey: [
            "readContracts",
            {
              contracts: [
                {
                  address: positionManagerAddress,
                  functionName: "getPosition",
                },
              ],
            },
          ],
        });

        // Invalidate token balances that might also be affected
        queryClient.invalidateQueries({
          queryKey: ["tokenBalances"],
        });

        // Invalidate the USDS token balance (ERC-20 balanceOf)
        const usdsTokenAddress = getTokenAddress("USDS", chainId);
        if (usdsTokenAddress) {
          queryClient.invalidateQueries({
            queryKey: [
              "readContract",
              {
                address: usdsTokenAddress,
                functionName: "balanceOf",
              },
            ],
          });
        }

        // Invalidate getCurrentTick queries for the auctioneer contract
        const auctioneerAddress = getContractAddress(
          ContractName.CONVERTIBLE_DEPOSIT_AUCTIONEER,
          chainId,
        );

        if (auctioneerAddress) {
          queryClient.invalidateQueries({
            queryKey: [
              "readContract",
              {
                address: auctioneerAddress,
                functionName: "getCurrentTick",
              },
            ],
          });
        }

        queryClient.invalidateQueries({
          queryKey: ["readContracts"],
        });
      }
    }
  }, [isConfirmed, address, chainId, queryClient]);

  const bid = ({
    contractAddress,
    depositPeriod,
    depositAmount,
    minOhmOut,
    wrapPosition,
    wrapReceipt,
    queryKey,
    isAuctionDisabled,
  }: {
    contractAddress: Address;
    depositPeriod: BidArgs[0];
    depositAmount: BidArgs[1];
    minOhmOut: BidArgs[2];
    wrapPosition: BidArgs[3];
    wrapReceipt: BidArgs[4];
    queryKey?: readonly unknown[];
    isAuctionDisabled?: boolean;
  }) => {
    // Prevent bids on disabled auctions (target === 0)
    if (isAuctionDisabled) {
      console.error(`Cannot bid on disabled auction for deposit period ${depositPeriod}`);
      return;
    }

    // Reset both Wagmi state and toast state for new transaction
    resetWrite();
    resetToast();

    writeContract(
      {
        address: contractAddress,
        abi: ConvertibleDepositAuctioneerABI,
        functionName: "bid",
        args: [depositPeriod, depositAmount, minOhmOut, wrapPosition, wrapReceipt],
      },
      {
        onSuccess: () => {
          if (queryKey) {
            queryClient.invalidateQueries({ queryKey });
          }
        },
      },
    );
  };

  const reset = () => {
    resetWrite();
    resetToast();
  };

  const isPending = isWritePending || isConfirming;
  const isSuccess = isConfirmed;
  const error = writeError || confirmError;

  return {
    bid,
    isPending,
    isSuccess,
    error,
    hash,
    reset,
    // Granular states for advanced use cases
    isWritePending,
    isConfirming,
    writeError,
    confirmError,
  };
}
