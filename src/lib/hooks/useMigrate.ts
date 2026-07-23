import { useChainId } from "wagmi";
import type { Hex } from "viem";
import { ContractName, getContractAddress } from "@/lib/contracts";
import V1MigratorAbi from "@/abis/V1Migrator";
import { useContractWriteFlow } from "./useContractWriteFlow";
import type { TransactionToastConfig } from "./useTransactionToast";

const toastConfig: TransactionToastConfig = {
  pending: {
    title: "Migrating OHM v1...",
    description: "Please wait while your transaction is confirmed.",
  },
  success: {
    title: "Migration complete!",
    description: "Your OHM v1 has been migrated to OHM v2.",
  },
  error: {
    title: "Migration failed",
    description: "There was an error migrating your OHM v1. Please try again.",
    userRejected: {
      title: "Transaction cancelled",
      description: "You cancelled the migration transaction.",
    },
    insufficientFunds: {
      title: "Insufficient funds",
      description: "You don't have enough ETH for gas fees.",
    },
  },
};

/**
 * Migrate OHM v1 → OHM v2 via the V1Migrator policy. The migrator `burnFrom`s OHM v1
 * (requires a prior exact-amount approval to the migrator) and mints OHM v2 to the user.
 */
export function useMigrate() {
  const chainId = useChainId();
  const migrator = getContractAddress(ContractName.OHM_V1_MIGRATOR, chainId);

  const { write, ...flow } = useContractWriteFlow({
    address: migrator,
    abi: V1MigratorAbi,
    functionName: "migrate",
    toastConfig,
  });

  const migrate = ({
    amount,
    proof,
    allocatedAmount,
    queryKey,
  }: {
    amount: bigint;
    proof: Hex[];
    allocatedAmount: bigint;
    queryKey?: readonly unknown[];
  }) =>
    // migrate(amount_, proof_, allocatedAmount_)
    write({ args: [amount, proof, allocatedAmount], queryKey });

  return { migrate, ...flow };
}
