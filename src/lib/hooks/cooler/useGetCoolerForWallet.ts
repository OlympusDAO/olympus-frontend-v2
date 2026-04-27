import { usePublicClient, useChainId } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { zeroAddress, type Address } from "viem";
import CoolerFactoryABI from "@/abis/CoolerFactory";
import CoolerFactoryV2ABI from "@/abis/CoolerFactoryV2";
import CoolerABI from "@/abis/Cooler";
import type { ClearingHouseVersion } from "./useGetClearingHouse";

export function useGetCoolerForWallet({
  walletAddress,
  factoryAddress,
  collateralAddress,
  debtAddress,
  clearingHouseVersion,
}: {
  walletAddress?: Address;
  factoryAddress?: Address;
  collateralAddress?: Address;
  debtAddress?: Address;
  clearingHouseVersion: ClearingHouseVersion;
}) {
  const publicClient = usePublicClient();
  const chainId = useChainId();

  const { data, isFetched, isLoading } = useQuery({
    queryKey: [
      "getCoolerForWallet",
      chainId,
      factoryAddress,
      collateralAddress,
      debtAddress,
      walletAddress,
      clearingHouseVersion,
    ],
    queryFn: async () => {
      if (!walletAddress || !factoryAddress || !collateralAddress || !debtAddress || !publicClient)
        return "";

      try {
        if (clearingHouseVersion === "clearingHouseV1") {
          // V1: use generateCooler (simulate call) then verify
          const address = await publicClient.simulateContract({
            address: factoryAddress,
            abi: CoolerFactoryABI,
            functionName: "generateCooler",
            args: [collateralAddress, debtAddress],
            account: walletAddress,
          });
          const coolerAddress = address.result as Address;

          const isCreated = await publicClient.readContract({
            address: factoryAddress,
            abi: CoolerFactoryABI,
            functionName: "created",
            args: [coolerAddress],
          });

          const coolerOwner = await publicClient.readContract({
            address: coolerAddress,
            abi: CoolerABI,
            functionName: "owner",
          });

          return isCreated && walletAddress === coolerOwner ? coolerAddress : "";
        } else {
          // V2/V3: use getCoolerFor
          const address = await publicClient.readContract({
            address: factoryAddress,
            abi: CoolerFactoryV2ABI,
            functionName: "getCoolerFor",
            args: [walletAddress, collateralAddress, debtAddress],
          });

          const coolerAddress = address as Address;
          const isCreated = await publicClient.readContract({
            address: factoryAddress,
            abi: CoolerFactoryV2ABI,
            functionName: "created",
            args: [coolerAddress],
          });

          return isCreated && coolerAddress && coolerAddress !== zeroAddress ? coolerAddress : "";
        }
      } catch {
        return "";
      }
    },
    enabled:
      !!walletAddress && !!factoryAddress && !!collateralAddress && !!debtAddress && !!publicClient,
  });

  return { data, isFetched, isLoading };
}
