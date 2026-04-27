import { useEffect, useRef } from "react";
import { useAccount, useChainId } from "wagmi";
import {
  trackWalletConnect,
  trackWalletDisconnect,
  identifyWallet,
  resetIdentity,
} from "@/lib/analytics";

export function useWalletAnalytics(): void {
  const { address, isConnected, connector } = useAccount();
  const chainId = useChainId();
  const prevConnectedRef = useRef(false);
  const prevWalletTypeRef = useRef<string | undefined>(undefined);
  const prevChainIdRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const walletType = connector?.name;
    // Wait for the connector to hydrate before firing the connect event so we
    // don't ingest wallet_connected with wallet_type=undefined.
    const isFullyConnected = isConnected && !!address && !!walletType;

    if (isFullyConnected && !prevConnectedRef.current) {
      identifyWallet(address, { walletType, chainId })
        .then(() => trackWalletConnect({ walletType, chainId }))
        .catch(() => trackWalletConnect({ walletType, chainId }));
      prevConnectedRef.current = true;
    } else if (
      isFullyConnected &&
      (walletType !== prevWalletTypeRef.current || chainId !== prevChainIdRef.current)
    ) {
      // Refresh person properties when the user switches wallet/chain mid-session.
      identifyWallet(address, { walletType, chainId });
    }

    if (!isConnected && prevConnectedRef.current) {
      trackWalletDisconnect();
      resetIdentity();
      prevConnectedRef.current = false;
    }

    prevWalletTypeRef.current = walletType;
    prevChainIdRef.current = chainId;
  }, [isConnected, address, connector, chainId]);
}
