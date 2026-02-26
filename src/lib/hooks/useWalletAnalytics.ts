import { useEffect, useRef } from "react";
import { useAccount } from "wagmi";
import { trackWalletConnect, trackWalletDisconnect } from "@/lib/analytics";

export function useWalletAnalytics(): void {
  const { address, isConnected } = useAccount();
  const prevConnectedRef = useRef(false);

  useEffect(() => {
    if (isConnected && address && !prevConnectedRef.current) {
      trackWalletConnect(address);
    }

    if (!isConnected && prevConnectedRef.current) {
      trackWalletDisconnect();
    }

    prevConnectedRef.current = isConnected;
  }, [isConnected, address]);
}
