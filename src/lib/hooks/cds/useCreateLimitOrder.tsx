import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useWriteContract, useWaitForTransactionReceipt, useAccount, useChainId } from "wagmi";
import type { ContractFunctionArgs } from "viem";
import { useTransactionToast, type TransactionToastConfig } from "@/lib/hooks/useTransactionToast";
import { getContractAddress, ContractName } from "@/lib/contracts";
import { getTokenAddress, TokenName } from "@/lib/tokens";
import LimitOrdersABI from "@/abis/LimitOrders";

type CreateOrderArgs = ContractFunctionArgs<typeof LimitOrdersABI, "nonpayable", "createOrder">;

export function useCreateLimitOrder() {
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

  // Toast configuration for createOrder transactions
  const toastConfig: TransactionToastConfig = {
    pending: {
      title: "Creating limit order...",
      description: "Please wait while your order is created.",
    },
    success: {
      title: "Limit order created!",
      description: "Your limit order has been created successfully.",
    },
    error: {
      title: "Order creation failed",
      description: "There was an error creating your limit order. Please try again.",
      userRejected: {
        title: "Order creation cancelled",
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

  // Invalidate relevant queries when order creation succeeds
  useEffect(() => {
    if (isConfirmed && address && chainId) {
      const limitOrdersAddress = getContractAddress(ContractName.LIMIT_ORDERS, chainId);

      if (limitOrdersAddress) {
        // Invalidate user's limit orders query
        queryClient.invalidateQueries({
          queryKey: [
            "readContract",
            {
              address: limitOrdersAddress,
              functionName: "getOrdersForUser",
              args: [address],
            },
          ],
        });

        // Invalidate all getOrder queries
        queryClient.invalidateQueries({
          queryKey: [
            "readContracts",
            {
              contracts: [
                {
                  address: limitOrdersAddress,
                  functionName: "getOrder",
                },
              ],
            },
          ],
        });

        // Invalidate USDS token balance
        const usdsTokenAddress = getTokenAddress(TokenName.USDS, chainId);
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

        // Invalidate token balances
        queryClient.invalidateQueries({
          queryKey: ["tokenBalances"],
        });

        // Invalidate getCurrentTick queries (capacity may have changed)
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

  const createOrder = ({
    depositPeriod,
    depositBudget,
    incentiveBudget,
    maxPrice,
    minFillSize,
    queryKey,
  }: {
    depositPeriod: CreateOrderArgs[0];
    depositBudget: CreateOrderArgs[1];
    incentiveBudget: CreateOrderArgs[2];
    maxPrice: CreateOrderArgs[3];
    minFillSize: CreateOrderArgs[4];
    queryKey?: readonly unknown[];
  }) => {
    const limitOrdersAddress = getContractAddress(ContractName.LIMIT_ORDERS, chainId);

    if (!limitOrdersAddress) {
      console.error(`Limit Orders contract not found on chain ${chainId}`);
      return;
    }

    // Reset both Wagmi state and toast state for new transaction
    resetWrite();
    resetToast();

    writeContract(
      {
        address: limitOrdersAddress,
        abi: LimitOrdersABI,
        functionName: "createOrder",
        args: [depositPeriod, depositBudget, incentiveBudget, maxPrice, minFillSize],
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
    createOrder,
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
