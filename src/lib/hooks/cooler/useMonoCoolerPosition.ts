import { useAccount, useChainId, useReadContracts } from "wagmi";
import { formatUnits, type Address } from "viem";
import { getContractAddress, ContractName } from "@/lib/contracts";
import CoolerV2MonoCoolerABI from "@/abis/CoolerV2MonoCooler";
import CoolerV2CompositesABI from "@/abis/CoolerV2Composites";

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

export function useMonoCoolerPosition({ chainId: overrideChainId }: { chainId?: number } = {}) {
  const { address } = useAccount();
  const connectedChainId = useChainId();
  const chainId = overrideChainId ?? connectedChainId;

  const monoCoolerAddress = getContractAddress(ContractName.COOLER_V2_MONOCOOLER, chainId);
  const compositesAddress = getContractAddress(ContractName.COOLER_V2_COMPOSITES, chainId);

  const { data, isLoading, error, refetch, queryKey } = useReadContracts({
    contracts: [
      {
        address: monoCoolerAddress,
        abi: CoolerV2MonoCoolerABI,
        functionName: "accountPosition",
        args: address ? [address] : undefined,
        chainId,
      },
      {
        address: monoCoolerAddress,
        abi: CoolerV2MonoCoolerABI,
        functionName: "interestRateWad",
        chainId,
      },
      {
        address: monoCoolerAddress,
        abi: CoolerV2MonoCoolerABI,
        functionName: "loanToValues",
        chainId,
      },
      {
        address: monoCoolerAddress,
        abi: CoolerV2MonoCoolerABI,
        functionName: "collateralToken",
        chainId,
      },
      {
        address: monoCoolerAddress,
        abi: CoolerV2MonoCoolerABI,
        functionName: "debtToken",
        chainId,
      },
      {
        address: monoCoolerAddress,
        abi: CoolerV2MonoCoolerABI,
        functionName: "borrowsPaused",
        chainId,
      },
      {
        address: monoCoolerAddress,
        abi: CoolerV2MonoCoolerABI,
        functionName: "isActive",
        chainId,
      },
      {
        address: compositesAddress,
        abi: CoolerV2CompositesABI,
        functionName: "isEnabled",
        chainId,
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
    const projectedLiquidationDate = calculateProjectedLiquidationDate(
      currentDebt,
      collateral,
      interestRateWad,
      currentLtv,
      liquidationLtv,
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

/** Convert WAD interest rate to basis points */
export function calculateInterestRateBps(interestRateWad: bigint): number {
  return Math.round((Math.exp(Number(interestRateWad) / 1e18) - 1) * 10000);
}

/** Calculate when continuous interest will push LTV past liquidation threshold */
export function calculateProjectedLiquidationDate(
  currentDebt: bigint,
  collateral: bigint,
  interestRateWad: bigint,
  currentLtv: bigint,
  liquidationLtv: bigint,
): Date | null {
  if (currentDebt === 0n || collateral === 0n) return null;

  const annualRate = Math.round((Math.exp(Number(interestRateWad) / 1e18) - 1) * 10000) / 10000;
  const currentLtvNum = Number(formatUnits(currentLtv, 18));
  const liquidationLtvNum = Number(formatUnits(liquidationLtv, 18));

  if (currentLtvNum >= liquidationLtvNum) return new Date();

  // t = ln(liquidationLtv / currentLtv) / annualRate
  const timeInYears = Math.log(liquidationLtvNum / currentLtvNum) / annualRate;
  const timeInMs = timeInYears * 365 * 24 * 60 * 60 * 1000;
  return new Date(Date.now() + timeInMs);
}
