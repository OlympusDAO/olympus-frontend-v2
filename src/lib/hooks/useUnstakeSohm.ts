import { useAccount, useChainId } from "wagmi";
import { ContractName, getContractAddress } from "@/lib/contracts";
import OlympusStakingAbi from "@/abis/OlympusStaking";
import { useContractWriteFlow } from "./useContractWriteFlow";
import type { TransactionToastConfig } from "./useTransactionToast";

const toastConfig: TransactionToastConfig = {
  pending: {
    title: "Unstaking sOHM...",
    description: "Please wait while your transaction is confirmed.",
  },
  success: {
    title: "Unstaked sOHM to OHM",
    description: "Your sOHM has been unstaked to OHM.",
  },
  error: {
    title: "Unstake transaction failed",
    description: "There was an error unstaking sOHM. Please try again.",
    userRejected: {
      title: "Transaction cancelled",
      description: "You cancelled the unstake transaction.",
    },
    insufficientFunds: {
      title: "Insufficient funds",
      description: "You don't have enough ETH for gas fees.",
    },
  },
};

/**
 * Unstake sOHM → OHM (1:1) via the staking contract. `_rebasing=true` burns sOHM
 * (false would burn gOHM — that path lives in useUnwrapGohm); `_trigger=false`
 * skips the gas-heavy rebase. Requires a prior sOHM approval to the staking contract.
 */
export function useUnstakeSohm() {
  const { address } = useAccount();
  const chainId = useChainId();
  const stakingAddress = getContractAddress(ContractName.STAKING, chainId);

  const { write, ...flow } = useContractWriteFlow({
    address: stakingAddress,
    abi: OlympusStakingAbi,
    functionName: "unstake",
    toastConfig,
  });

  const unstake = ({ amount, queryKey }: { amount: bigint; queryKey?: readonly unknown[] }) => {
    if (!address) return;
    return write({ args: [address, amount, false, true], queryKey });
  };

  return { unstake, ...flow };
}
