import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import {
  baseAccount,
  injectedWallet,
  metaMaskWallet,
  rainbowWallet,
  safeWallet,
  walletConnectWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { allChains, transports } from "@/lib/chains";
import type { Config } from "wagmi";

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;

if (!projectId) {
  console.warn(
    "VITE_WALLETCONNECT_PROJECT_ID is not set. WalletConnect will not work. " +
      "Get a free project ID at https://cloud.walletconnect.com",
  );
}

// "Browser Wallet" fallback for injected providers that RainbowKit's default
// list can't reach: wallet in-app browsers and extensions that neither announce
// via EIP-6963 nor match the MetaMask/Base buttons. Hidden when the injected
// provider is MetaMask or Coinbase/Base, which already have dedicated buttons.
const needsInjectedWalletFallback =
  typeof window !== "undefined" &&
  window.ethereum &&
  !window.ethereum.isMetaMask &&
  !window.ethereum.isCoinbaseWallet;

export const config: Config = getDefaultConfig({
  appName: "Olympus",
  projectId: projectId || "PLACEHOLDER",
  chains: allChains,
  transports,
  ssr: false,
  wallets: [
    {
      groupName: "Popular",
      wallets: [
        safeWallet,
        rainbowWallet,
        baseAccount,
        metaMaskWallet,
        walletConnectWallet,
        ...(needsInjectedWalletFallback ? [injectedWallet] : []),
      ],
    },
  ],
});
