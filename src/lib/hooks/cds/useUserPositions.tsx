import { useAccount, useReadContract, useReadContracts } from "wagmi";
import { getContractAddress, ContractName } from "@/lib/contracts";
import { useChainId } from "wagmi";
import ConvertibleDepositPositionManagerABI from "@/abis/ConvertibleDepositPositionManager";
import type { ContractFunctionReturnType } from "viem";

type PositionData = ContractFunctionReturnType<
  typeof ConvertibleDepositPositionManagerABI,
  "view",
  "getPosition"
>;

export const useUserPositions = () => {
  const { address } = useAccount();
  const chainId = useChainId();

  const positionManagerAddress = getContractAddress(
    ContractName.CONVERTIBLE_DEPOSIT_POSITION_MANAGER,
    chainId
  );

  // Get user's position IDs
  const {
    data: positionIds,
    isLoading: isLoadingIds,
    error: idsError,
  } = useReadContract({
    address: positionManagerAddress,
    abi: ConvertibleDepositPositionManagerABI,
    functionName: "getUserPositionIds",
    args: [address as `0x${string}`],
    query: {
      enabled: !!address && !!positionManagerAddress,
    },
  });

  // Get position details for each ID
  const positionContracts =
    (positionIds as bigint[] | undefined)?.map((id) => ({
      address: positionManagerAddress,
      abi: ConvertibleDepositPositionManagerABI,
      functionName: "getPosition",
      args: [id],
    })) || [];

  const {
    data: positionsData,
    isLoading: isLoadingPositions,
    error: positionsError,
  } = useReadContracts({
    contracts: positionContracts,
    query: {
      enabled:
        !!positionIds && positionIds.length > 0 && !!positionManagerAddress,
    },
  });

  // Combine position IDs with their data
  const positions =
    positionIds && positionsData
      ? (positionIds as bigint[])
          .map((id, index) => ({
            id,
            data: positionsData[index]?.result as PositionData | undefined,
          }))
          .filter((pos) => pos.data && pos.data.remainingDeposit > 0n) // Filter out any failed position fetches
      : [];

  return {
    positions,
    isLoading: isLoadingIds || isLoadingPositions,
    error: idsError || positionsError,
    refetch: () => {
      // This would trigger a refetch of both queries
    },
  };
};
