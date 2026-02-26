import { useReadContract } from "wagmi"
import type { Address } from "viem"
import ConvertibleDepositFacilityABI from "@/abis/ConvertibleDepositFacility"

export function useDepositManager(facilityAddress: Address | undefined) {
  const { data: depositManagerAddress, isLoading, error } = useReadContract({
    address: facilityAddress,
    abi: ConvertibleDepositFacilityABI,
    functionName: "DEPOSIT_MANAGER",
    query: {
      enabled: !!facilityAddress,
    },
  })

  return {
    depositManagerAddress: depositManagerAddress as Address | undefined,
    isLoading,
    error,
  }
}