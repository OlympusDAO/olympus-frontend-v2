import { useChainId, useReadContracts, usePublicClient } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { formatUnits, type Address } from "viem";
import { getContractAddress, ContractName } from "@/lib/contracts";
import CoolerClearingHouseABI from "@/abis/CoolerClearingHouse";
import CoolerClearingHouseV1ABI from "@/abis/CoolerClearingHouseV1";
import ERC20ABI from "@/abis/ERC20";

export type ClearingHouseVersion = "clearingHouseV1" | "clearingHouseV2" | "clearingHouseV3";

// Minimal ERC4626 ABI for what we need
const ERC4626_ABI = [
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "shares", type: "uint256" }],
    name: "convertToAssets",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export interface ClearingHouseData {
  interestRate: string;
  duration: string;
  loanToCollateral: string;
  factory: Address;
  collateralAddress: Address;
  debtAddress: Address;
  capacity: bigint;
  clearingHouseAddress: Address;
  debtAssetName: string;
  isActive: boolean;
}

function getContractNameForVersion(version: ClearingHouseVersion): ContractName {
  switch (version) {
    case "clearingHouseV1":
      return ContractName.COOLER_CLEARING_HOUSE_V1;
    case "clearingHouseV2":
      return ContractName.COOLER_CLEARING_HOUSE_V2;
    case "clearingHouseV3":
      return ContractName.COOLER_CLEARING_HOUSE_V3;
  }
}

function getAbiForVersion(version: ClearingHouseVersion) {
  return version === "clearingHouseV3" ? CoolerClearingHouseABI : CoolerClearingHouseV1ABI;
}

export function useGetClearingHouse({ clearingHouse }: { clearingHouse: ClearingHouseVersion }) {
  const chainId = useChainId();
  const publicClient = usePublicClient();

  const contractName = getContractNameForVersion(clearingHouse);
  const clearingHouseAddress = getContractAddress(contractName, chainId);
  const abi = getAbiForVersion(clearingHouse);

  // Batch read basic clearing house data
  const { data: basicData } = useReadContracts({
    contracts: [
      { address: clearingHouseAddress, abi, functionName: "factory" },
      { address: clearingHouseAddress, abi, functionName: "INTEREST_RATE" },
      { address: clearingHouseAddress, abi, functionName: "DURATION" },
      { address: clearingHouseAddress, abi, functionName: "LOAN_TO_COLLATERAL" },
      { address: clearingHouseAddress, abi, functionName: "gohm" },
      {
        address: clearingHouseAddress,
        abi,
        functionName: clearingHouse === "clearingHouseV3" ? "isActive" : "active",
      },
    ],
    query: { enabled: !!clearingHouseAddress },
  });

  // Once we have basic data, fetch debt/reserve info
  const { data, isLoading, isFetched } = useQuery({
    queryKey: ["getClearingHouse", chainId, clearingHouse, basicData?.[0]?.result],
    queryFn: async () => {
      if (!basicData || !basicData.every((d) => d.status === "success") || !publicClient || !clearingHouseAddress)
        return null;

      const factory = basicData[0].result as Address;
      const interestRateRaw = basicData[1].result as bigint;
      const durationRaw = basicData[2].result as bigint;
      const loanToCollateralRaw = basicData[3].result as bigint;
      const collateralAddress = basicData[4].result as Address;
      const isActive = basicData[5].result as boolean;

      const interestRate = formatUnits(interestRateRaw, 16);
      const duration = (durationRaw / 86400n).toString();
      const loanToCollateral = formatUnits(loanToCollateralRaw, 18);

      // Get debt and sReserve addresses based on version
      let debtAddress: Address;
      let sReserveAddress: Address;

      if (clearingHouse === "clearingHouseV3") {
        [debtAddress, sReserveAddress] = await Promise.all([
          publicClient.readContract({
            address: clearingHouseAddress,
            abi: CoolerClearingHouseABI,
            functionName: "reserve",
          }) as Promise<Address>,
          publicClient.readContract({
            address: clearingHouseAddress,
            abi: CoolerClearingHouseABI,
            functionName: "sReserve",
          }) as Promise<Address>,
        ]);
      } else {
        [debtAddress, sReserveAddress] = await Promise.all([
          publicClient.readContract({
            address: clearingHouseAddress,
            abi: CoolerClearingHouseV1ABI,
            functionName: "dai",
          }) as Promise<Address>,
          publicClient.readContract({
            address: clearingHouseAddress,
            abi: CoolerClearingHouseV1ABI,
            functionName: "sdai",
          }) as Promise<Address>,
        ]);
      }

      // Get debt asset name and sReserve balance
      const [debtAssetName, sReserveBalance] = await Promise.all([
        publicClient.readContract({
          address: debtAddress,
          abi: ERC20ABI,
          functionName: "symbol",
        }) as Promise<string>,
        publicClient.readContract({
          address: sReserveAddress,
          abi: ERC4626_ABI,
          functionName: "balanceOf",
          args: [clearingHouseAddress],
        }) as Promise<bigint>,
      ]);

      // Convert sReserve balance to underlying asset amount
      const capacity = await publicClient.readContract({
        address: sReserveAddress,
        abi: ERC4626_ABI,
        functionName: "convertToAssets",
        args: [sReserveBalance],
      });

      return {
        interestRate,
        duration,
        loanToCollateral,
        factory,
        collateralAddress,
        debtAddress,
        capacity,
        clearingHouseAddress,
        debtAssetName,
        isActive,
      } satisfies ClearingHouseData;
    },
    enabled: !!basicData && basicData.every((d) => d.status === "success") && !!publicClient,
  });

  return { data, isFetched, isLoading };
}
