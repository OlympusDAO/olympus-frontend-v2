import { useAccount, useChainId } from "wagmi";
import { ContractName, getContractAddress } from "@/lib/contracts";
import OlympusStakingAbi from "@/abis/OlympusStaking";
import { useContractWriteFlow } from "./useContractWriteFlow";
import type { TransactionToastConfig } from "./useTransactionToast";

const toastConfig: TransactionToastConfig = {
  pending: {
    title: "Wrapping sOHM...",
    description: "Please wait while your transaction is confirmed.",
  },
  success: {
    title: "Wrapped sOHM to gOHM",
    description: "Your sOHM has been wrapped to gOHM.",
  },
  error: {
    title: "Wrap transaction failed",
    description: "There was an error wrapping sOHM. Please try again.",
    userRejected: {
      title: "Transaction cancelled",
      description: "You cancelled the wrap transaction.",
    },
    insufficientFunds: {
      title: "Insufficient funds",
      description: "You don't have enough ETH for gas fees.",
    },
  },
};

/**
 * Wrap sOHM → gOHM via the staking contract's `wrap` (converted at the gOHM index).
 * Requires a prior sOHM approval to the staking contract.
 */
export function useWrapSohm() {
  const { address } = useAccount();
  const chainId = useChainId();
  const stakingAddress = getContractAddress(ContractName.STAKING, chainId);

  const { write, ...flow } = useContractWriteFlow({
    address: stakingAddress,
    abi: OlympusStakingAbi,
    functionName: "wrap",
    toastConfig,
  });

  const wrap = ({ amount, queryKey }: { amount: bigint; queryKey?: readonly unknown[] }) => {
    if (!address) return;
    return write({ args: [address, amount], queryKey });
  };

  return { wrap, ...flow };
}
