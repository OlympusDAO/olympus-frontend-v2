import { useReadContract } from "wagmi";
import { getContractAddress, ContractName } from "@/lib/contracts";
import { useChainId, useAccount } from "wagmi";
import ConvertibleDepositFacilityABI from "@/abis/ConvertibleDepositFacility";

interface PreviewConvertParams {
  positionIds: bigint[];
  amounts: bigint[];
  enabled?: boolean;
}

export const usePreviewConvert = ({
  positionIds,
  amounts,
  enabled = true,
}: PreviewConvertParams) => {
  const { address } = useAccount();
  const chainId = useChainId();

  const facilityAddress = getContractAddress(ContractName.CONVERTIBLE_DEPOSIT_FACILITY, chainId);

  const shouldExecute =
    enabled &&
    !!address &&
    !!facilityAddress &&
    positionIds.length > 0 &&
    amounts.length > 0 &&
    positionIds.length === amounts.length;

  const { data, isLoading, error, refetch } = useReadContract({
    address: facilityAddress,
    abi: ConvertibleDepositFacilityABI,
    functionName: "previewConvert",
    args: [address as `0x${string}`, positionIds, amounts],
    query: {
      enabled: shouldExecute,
    },
  });

  return {
    data: data
      ? {
          receiptTokenIn: data[0] as bigint,
          convertedTokenOut: data[1] as bigint,
        }
      : undefined,
    isLoading,
    error,
    refetch,
  };
};
