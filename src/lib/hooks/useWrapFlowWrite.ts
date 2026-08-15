import { useAccount, useChainId } from "wagmi";
import { ContractName, getContractAddress } from "@/lib/contracts";
import { TOKENS } from "@/lib/tokens";
import OlympusStakingAbi from "@/abis/OlympusStaking";
import { WRAP_FLOWS, type WrapFlow } from "@/modules/ohm/components/wrap-flows";
import { useContractWriteFlow } from "./useContractWriteFlow";
import type { TransactionToastConfig } from "./useTransactionToast";

type StakingCall = {
  functionName: "stake" | "wrap" | "unstake";
  args: (to: `0x${string}`, amount: bigint) => readonly unknown[];
};

/** Staking-contract call for each Wrap-page flow. `_trigger=false` skips the gas-heavy rebase. */
const FLOW_CALLS: Record<WrapFlow, StakingCall> = {
  // stake(to, amount, rebasing=false, claim=true) -> mints gOHM
  "wrap-ohm": { functionName: "stake", args: (to, amount) => [to, amount, false, true] },
  // wrap(to, amount) -> sOHM to gOHM at the index
  "wrap-sohm": { functionName: "wrap", args: (to, amount) => [to, amount] },
  // unstake(to, amount, trigger=false, rebasing=false) -> burns gOHM
  "unwrap-gohm": { functionName: "unstake", args: (to, amount) => [to, amount, false, false] },
  // unstake(to, amount, trigger=false, rebasing=true) -> burns sOHM 1:1
  "unstake-sohm": { functionName: "unstake", args: (to, amount) => [to, amount, false, true] },
};

function toastConfigFor(flow: WrapFlow): TransactionToastConfig {
  const { input, output, toast } = WRAP_FLOWS[flow];
  const from = TOKENS[input].symbol;
  const to = TOKENS[output].symbol;
  return {
    pending: {
      title: `${toast.progressive} ${from}...`,
      description: "Please wait while your transaction is confirmed.",
    },
    success: {
      title: `${toast.past} ${from} to ${to}`,
      description: `Your ${from} has been ${toast.past.toLowerCase()} to ${to}.`,
    },
    error: {
      title: `${toast.noun} transaction failed`,
      description: `There was an error ${toast.progressive.toLowerCase()} ${from}. Please try again.`,
      userRejected: {
        title: "Transaction cancelled",
        description: `You cancelled the ${toast.noun.toLowerCase()} transaction.`,
      },
      insufficientFunds: {
        title: "Insufficient funds",
        description: "You don't have enough ETH for gas fees.",
      },
    },
  };
}

/**
 * Executes the staking-contract write for a Wrap-page flow (OHM/sOHM → gOHM, gOHM/sOHM → OHM).
 * Built on useContractWriteFlow for gas buffering, double-submit protection, query
 * invalidation, and toasts. Requires a prior input-token approval to the staking contract.
 */
export function useWrapFlowWrite(flow: WrapFlow) {
  const { address } = useAccount();
  const chainId = useChainId();
  const stakingAddress = getContractAddress(ContractName.STAKING, chainId);
  const call = FLOW_CALLS[flow];

  const { write, ...rest } = useContractWriteFlow({
    address: stakingAddress,
    abi: OlympusStakingAbi,
    functionName: call.functionName,
    toastConfig: toastConfigFor(flow),
  });

  const execute = ({ amount, queryKey }: { amount: bigint; queryKey?: readonly unknown[] }) => {
    if (!address) return;
    return write({ args: call.args(address, amount), queryKey });
  };

  return { execute, ...rest };
}
