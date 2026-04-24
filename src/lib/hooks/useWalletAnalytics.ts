import { useEffect, useRef } from "react";
import { useAccount } from "wagmi";
import {
  trackWalletConnect,
  trackWalletDisconnect,
  identifyWallet,
  resetIdentity,
} from "@/lib/analytics";

export function useWalletAnalytics(): void {
  const { address, isConnected } = useAccount();
  const prevConnectedRef = useRef(false);

  useEffect(() => {
    if (isConnected && address && !prevConnectedRef.current) {
      identifyWallet(address).then(() => trackWalletConnect(address));
    }

    if (!isConnected && prevConnectedRef.current) {
      trackWalletDisconnect();
      resetIdentity();
    }

    prevConnectedRef.current = isConnected;
  }, [isConnected, address]);
}
