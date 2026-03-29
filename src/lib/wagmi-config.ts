import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { allChains, transports } from "@/lib/chains";
import type { Config } from "wagmi";

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;

if (!projectId) {
  console.warn(
    "VITE_WALLETCONNECT_PROJECT_ID is not set. WalletConnect will not work. " +
      "Get a free project ID at https://cloud.walletconnect.com",
  );
}

export const config: Config = getDefaultConfig({
  appName: "Olympus",
  projectId: projectId || "PLACEHOLDER",
  chains: allChains,
  transports,
  ssr: false,
});
