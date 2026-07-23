import { useChainId } from "wagmi";
import { ContractName, getContractAddress } from "@/lib/contracts";
import WsOHMAbi from "@/abis/WsOHM";
import { useContractWriteFlow } from "./useContractWriteFlow";
import type { TransactionToastConfig } from "./useTransactionToast";

const toastConfig: TransactionToastConfig = {
  pending: {
    title: "Unwrapping wsOHM...",
    description: "Please wait while your transaction is confirmed.",
  },
  success: {
    title: "Unwrapped to sOHM v1",
    description: "Your wsOHM has been unwrapped to sOHM v1. Next, unstake it to OHM v1.",
  },
  error: {
    title: "Unwrap failed",
    description: "There was an error unwrapping your wsOHM. Please try again.",
    userRejected: {
      title: "Transaction cancelled",
      description: "You cancelled the unwrap transaction.",
    },
    insufficientFunds: {
      title: "Insufficient funds",
      description: "You don't have enough ETH for gas fees.",
    },
  },
};

/**
 * Unwrap wsOHM → sOHM v1 via the legacy wsOHM contract. No approval is needed (the
 * contract burns the caller's own wsOHM). The resulting sOHM v1 can then be unstaked to
 * OHM v1 and migrated. wsOHM is 18 decimals; the returned sOHM v1 is 9 decimals and
 * scaled by the gOHM index (not 1:1).
 */
export function useUnwrapWsohm() {
  const chainId = useChainId();
  const wsohmAddress = getContractAddress(ContractName.WSOHM, chainId);

  const { write, ...flow } = useContractWriteFlow({
    address: wsohmAddress,
    abi: WsOHMAbi,
    functionName: "unwrap",
    toastConfig,
  });

  const unwrap = ({ amount, queryKey }: { amount: bigint; queryKey?: readonly unknown[] }) =>
    write({ args: [amount], queryKey });

  return { unwrap, ...flow };
}
