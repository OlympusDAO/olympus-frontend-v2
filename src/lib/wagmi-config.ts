import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { mainnet, sepolia, isTestnetMode, transports } from "@/lib/chains";
import type { Config } from "wagmi";

export const config: Config = getDefaultConfig({
  appName: "Olympus",
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID ?? "",
  chains: isTestnetMode ? [sepolia] : [mainnet],
  transports,
  ssr: false,
});
