import { usePublicClient, useChainId } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { type Address } from "viem";
import CoolerABI from "@/abis/Cooler";
import CoolerFactoryABI from "@/abis/CoolerFactory";
import ERC20ABI from "@/abis/ERC20";

export interface CoolerLoan {
  loanId: number;
  request: {
    amount: bigint;
    interest: bigint;
    loanToCollateral: bigint;
    duration: bigint;
    active: boolean;
    requester: Address;
  };
  principal: bigint;
  interestDue: bigint;
  collateral: bigint;
  expiry: bigint;
  lender: Address;
  repayDirect: boolean;
  callback: boolean;
  debtAssetName: string;
}

export function useGetCoolerLoans({
  walletAddress,
  factoryAddress,
  collateralAddress,
  debtAddress,
}: {
  walletAddress?: Address;
  factoryAddress?: Address;
  collateralAddress?: Address;
  debtAddress?: Address;
}) {
  const publicClient = usePublicClient();
  const chainId = useChainId();

  const { data, isFetched, isLoading, isFetching } = useQuery({
    queryKey: ["getCoolerLoans", chainId, factoryAddress, collateralAddress, debtAddress, walletAddress],
    queryFn: async () => {
      if (!walletAddress || !factoryAddress || !collateralAddress || !debtAddress || !publicClient) return [];

      try {
        // Get cooler address from factory
        const coolerAddress = await publicClient.simulateContract({
          address: factoryAddress,
          abi: CoolerFactoryABI,
          functionName: "generateCooler",
          args: [collateralAddress, debtAddress],
          account: walletAddress,
        });
        const cooler = coolerAddress.result as Address;

        // Get debt asset name
        const debtAssetName = await publicClient.readContract({
          address: debtAddress,
          abi: ERC20ABI,
          functionName: "symbol",
        }) as string;

        // Iterate through loans until revert
        const loans: CoolerLoan[] = [];
        let loanId = 0;
        while (true) {
          try {
            const loanData = await publicClient.readContract({
              address: cooler,
              abi: CoolerABI,
              functionName: "getLoan",
              args: [BigInt(loanId)],
            });

            const result = loanData as unknown as {
              request: {
                amount: bigint;
                interest: bigint;
                loanToCollateral: bigint;
                duration: bigint;
                active: boolean;
                requester: Address;
              };
              principal: bigint;
              interestDue: bigint;
              collateral: bigint;
              expiry: bigint;
              lender: Address;
              repayDirect: boolean;
              callback: boolean;
            };

            loans.push({
              loanId,
              request: result.request,
              principal: result.principal,
              interestDue: result.interestDue,
              collateral: result.collateral,
              expiry: result.expiry,
              lender: result.lender,
              repayDirect: result.repayDirect,
              callback: result.callback,
              debtAssetName,
            });
            loanId++;
          } catch {
            break;
          }
        }

        // Filter out closed loans (zero collateral or zero principal)
        return loans.filter((loan) => loan.collateral > 0n && loan.principal > 0n);
      } catch {
        return [];
      }
    },
    enabled: !!walletAddress && !!factoryAddress && !!collateralAddress && !!debtAddress && !!publicClient,
  });

  return { data, isFetched, isLoading, isFetching };
}
