import { useChainId } from "wagmi";
import { ContractName, getContractAddress } from "@/lib/contracts";
import OlympusStakingV1Abi from "@/abis/OlympusStakingV1";
import { useContractWriteFlow } from "./useContractWriteFlow";
import type { TransactionToastConfig } from "./useTransactionToast";

const toastConfig: TransactionToastConfig = {
  pending: {
    title: "Unstaking sOHM v1...",
    description: "Please wait while your transaction is confirmed.",
  },
  success: {
    title: "Unstaked to OHM v1",
    description: "Your sOHM v1 has been unstaked to OHM v1. You can now migrate.",
  },
  error: {
    title: "Unstake failed",
    description: "There was an error unstaking your sOHM v1. Please try again.",
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
 * Unstake sOHM v1 → OHM v1 via the legacy Olympus v1 staking contract (1:1). Requires a
 * prior exact-amount sOHM v1 approval to the staking contract. This is the prerequisite
 * step for sOHM v1 holders who want to migrate (the migrator only burns OHM v1).
 */
export function useUnstakeV1() {
  const chainId = useChainId();
  const stakingV1 = getContractAddress(ContractName.STAKING_V1, chainId);

  const { write, ...flow } = useContractWriteFlow({
    address: stakingV1,
    abi: OlympusStakingV1Abi,
    functionName: "unstake",
    toastConfig,
  });

  const unstake = ({ amount, queryKey }: { amount: bigint; queryKey?: readonly unknown[] }) =>
    // unstake(_amount, _trigger=false) — trigger=false skips the (gas-heavy) rebase.
    write({ args: [amount, false], queryKey });

  return { unstake, ...flow };
}
