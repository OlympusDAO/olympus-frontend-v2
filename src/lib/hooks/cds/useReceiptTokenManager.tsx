import { useChainId } from "wagmi";
import { getContractAddress, ContractName } from "@/lib/contracts";

export function useReceiptTokenManager() {
  const chainId = useChainId();
  const receiptTokenManagerAddress = getContractAddress(
    ContractName.RECEIPT_TOKEN_MANAGER,
    chainId,
  );

  return {
    receiptTokenManagerAddress,
    isLoading: false,
    error: receiptTokenManagerAddress
      ? undefined
      : new Error(`ReceiptTokenManager not deployed on chain ${chainId}`),
  };
}
