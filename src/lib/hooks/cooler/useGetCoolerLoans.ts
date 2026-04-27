import { usePublicClient, useChainId } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import type { Address } from "viem";
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
    queryKey: [
      "getCoolerLoans",
      chainId,
      factoryAddress,
      collateralAddress,
      debtAddress,
      walletAddress,
    ],
    queryFn: async () => {
      if (!walletAddress || !factoryAddress || !collateralAddress || !debtAddress || !publicClient)
        return [];

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
        const debtAssetName = (await publicClient.readContract({
          address: debtAddress,
          abi: ERC20ABI,
          functionName: "symbol",
        })) as string;

        // Batch fetch loans using multicall, probing in batches of 10
        const loans: CoolerLoan[] = [];
        const BATCH_SIZE = 10;
        const MAX_LOANS = 100;
        let offset = 0;
        let done = false;

        while (!done && offset < MAX_LOANS) {
          const calls = Array.from({ length: BATCH_SIZE }, (_, i) => ({
            address: cooler,
            abi: CoolerABI,
            functionName: "getLoan" as const,
            args: [BigInt(offset + i)] as const,
          }));

          const results = await publicClient.multicall({ contracts: calls, allowFailure: true });

          for (let i = 0; i < results.length; i++) {
            const res = results[i];
            if (res.status === "failure") {
              done = true;
              break;
            }

            const result = res.result as unknown as {
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
              loanId: offset + i,
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
          }

          offset += BATCH_SIZE;
        }

        // Filter out closed loans (zero collateral or zero principal)
        return loans.filter((loan) => loan.collateral > 0n && loan.principal > 0n);
      } catch {
        return [];
      }
    },
    enabled:
      !!walletAddress && !!factoryAddress && !!collateralAddress && !!debtAddress && !!publicClient,
  });

  return { data, isFetched, isLoading, isFetching };
}
