import { useEffect, useState } from "react";
import { useAccount, usePublicClient } from "wagmi";

/**
 * Detects if the connected wallet is a smart contract wallet (multisig, Safe, etc.)
 *
 * Smart contract wallets cannot sign EIP-712 messages directly with signTypedData,
 * so they need alternative authorization flows for Cooler V2.
 */
export function useIsSmartContractWallet() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const [isSmartContractWallet, setIsSmartContractWallet] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const check = async () => {
      if (!address || !isConnected || !publicClient) {
        setIsSmartContractWallet(false);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const code = await publicClient.getCode({ address });
        const isContract = code !== undefined && code !== "0x" && code.length > 2;
        setIsSmartContractWallet(isContract);
      } catch {
        setIsSmartContractWallet(false);
      } finally {
        setIsLoading(false);
      }
    };

    check();
  }, [address, isConnected, publicClient]);

  return { isSmartContractWallet, isLoading };
}
