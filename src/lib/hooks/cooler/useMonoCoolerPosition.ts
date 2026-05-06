import { useAccount, useChainId, useReadContracts } from "wagmi";
import type { Address } from "viem";
import { getContractAddress, ContractName } from "@/lib/contracts";
import CoolerV2MonoCoolerABI from "@/abis/CoolerV2MonoCooler";
import CoolerV2CompositesABI from "@/abis/CoolerV2Composites";
import { wmul } from "@/lib/utils/wad-math";
import { calculateInterestRateBps, computeLiquidationDate } from "./cooler-math";

export interface MonoCoolerPosition {
  collateral: bigint;
  currentDebt: bigint;
  maxOriginationDebtAmount: bigint;
  liquidationDebtAmount: bigint;
  healthFactor: bigint;
  currentLtv: bigint;
  totalDelegated: bigint;
  numDelegateAddresses: bigint;
  maxDelegateAddresses: bigint;
  interestRateWad: bigint;
  interestRateBps: number;
  maxOriginationLtv: bigint;
  liquidationLtv: bigint;
  debtAssetName: string;
  collateralAssetName: string;
  debtAddress: Address;
  collateralAddress: Address;
  borrowsPaused: boolean;
  isActive: boolean;
  isEnabled: boolean;
  projectedLiquidationDate: Date | null;
}

export function useMonoCoolerPosition() {
  const { address } = useAccount();
  const chainId = useChainId();

  const monoCoolerAddress = getContractAddress(ContractName.COOLER_V2_MONOCOOLER, chainId);
  const compositesAddress = getContractAddress(ContractName.COOLER_V2_COMPOSITES, chainId);

  const { data, isLoading, error, refetch, queryKey } = useReadContracts({
    contracts: [
      {
        address: monoCoolerAddress,
        abi: CoolerV2MonoCoolerABI,
        functionName: "accountPosition",
        args: address ? [address] : undefined,
      },
      {
        address: monoCoolerAddress,
        abi: CoolerV2MonoCoolerABI,
        functionName: "interestRateWad",
      },
      {
        address: monoCoolerAddress,
        abi: CoolerV2MonoCoolerABI,
        functionName: "loanToValues",
      },
      {
        address: monoCoolerAddress,
        abi: CoolerV2MonoCoolerABI,
        functionName: "collateralToken",
      },
      {
        address: monoCoolerAddress,
        abi: CoolerV2MonoCoolerABI,
        functionName: "debtToken",
      },
      {
        address: monoCoolerAddress,
        abi: CoolerV2MonoCoolerABI,
        functionName: "borrowsPaused",
      },
      {
        address: monoCoolerAddress,
        abi: CoolerV2MonoCoolerABI,
        functionName: "isActive",
      },
      {
        address: compositesAddress,
        abi: CoolerV2CompositesABI,
        functionName: "isEnabled",
      },
    ],
    query: {
      enabled: !!address && !!monoCoolerAddress,
    },
  });

  let position: MonoCoolerPosition | undefined;

  if (data && data.every((d) => d.status === "success")) {
    const accountPosition = data[0].result as unknown as {
      collateral: bigint;
      currentDebt: bigint;
      maxOriginationDebtAmount: bigint;
      liquidationDebtAmount: bigint;
      healthFactor: bigint;
      currentLtv: bigint;
      totalDelegated: bigint;
      numDelegateAddresses: bigint;
      maxDelegateAddresses: bigint;
    };
    const interestRateWad = data[1].result as bigint;
    const loanToValues = data[2].result as unknown as readonly [bigint, bigint];
    const collateralToken = data[3].result as Address;
    const debtToken = data[4].result as Address;
    const borrowsPaused = data[5].result as boolean;
    const isActive = data[6].result as boolean;
    const isEnabled = data[7].result as boolean;

    const {
      collateral,
      currentDebt,
      maxOriginationDebtAmount,
      liquidationDebtAmount,
      healthFactor,
      currentLtv,
      totalDelegated,
      numDelegateAddresses,
      maxDelegateAddresses,
    } = accountPosition;
    const [maxOriginationLtv, liquidationLtv] = loanToValues;

    const interestRateBps = calculateInterestRateBps(interestRateWad);
    const projectedLiquidationDate = computeLiquidationDate(
      currentDebt,
      wmul(collateral, liquidationLtv),
      interestRateWad,
    );

    position = {
      collateral,
      currentDebt,
      maxOriginationDebtAmount,
      liquidationDebtAmount,
      healthFactor,
      currentLtv,
      totalDelegated,
      numDelegateAddresses,
      maxDelegateAddresses,
      interestRateWad,
      interestRateBps,
      maxOriginationLtv,
      liquidationLtv,
      debtAssetName: "USDS",
      collateralAssetName: "gOHM",
      debtAddress: debtToken,
      collateralAddress: collateralToken,
      borrowsPaused,
      isActive,
      isEnabled,
      projectedLiquidationDate,
    };
  }

  return {
    position,
    isLoading,
    error,
    refetch,
    queryKey,
  };
}
