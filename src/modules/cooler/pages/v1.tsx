import { useState, useMemo } from "react";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/button";
import { V1StatsBar } from "../components/v1-stats-bar";
import { V1LoansTable } from "../components/v1-loans-table";
import { V1RepayLegacyModal } from "../components/v1-repay-legacy-modal.tsx";
import { V1ExtendLoanModal } from "../components/v1-extend-loan-modal.tsx";
import { V1MigrateModal } from "../components/v1-migrate-modal.tsx";
import {
  useGetClearingHouse,
  type ClearingHouseVersion,
} from "@/lib/hooks/cooler/useGetClearingHouse";
import { useGetCoolerForWallet } from "@/lib/hooks/cooler/useGetCoolerForWallet";
import { useGetCoolerLoans } from "@/lib/hooks/cooler/useGetCoolerLoans";
import type { CoolerLoan } from "@/lib/hooks/cooler/useGetCoolerLoans";

export function CoolerV1Page() {
  const { address } = useAccount();
  // Fetch clearing house data for all versions
  const { data: v1ClearingHouse, isLoading: isV1CHLoading } = useGetClearingHouse({
    clearingHouse: "clearingHouseV1",
  });
  const { data: v2ClearingHouse, isLoading: isV2CHLoading } = useGetClearingHouse({
    clearingHouse: "clearingHouseV2",
  });
  const { data: v3ClearingHouse, isLoading: isV3CHLoading } = useGetClearingHouse({
    clearingHouse: "clearingHouseV3",
  });

  // Use V3 if active, else V2/V1
  const activeClearingHouse = useMemo(() => {
    if (v3ClearingHouse?.isActive) return v3ClearingHouse;
    if (v2ClearingHouse?.isActive) return v2ClearingHouse;
    return v1ClearingHouse ?? null;
  }, [v1ClearingHouse, v2ClearingHouse, v3ClearingHouse]);

  // Fetch cooler addresses for each version
  const { data: v1CoolerAddress } = useGetCoolerForWallet({
    walletAddress: address,
    factoryAddress: v1ClearingHouse?.factory,
    collateralAddress: v1ClearingHouse?.collateralAddress,
    debtAddress: v1ClearingHouse?.debtAddress,
    clearingHouseVersion: "clearingHouseV1",
  });
  const { data: v2CoolerAddress } = useGetCoolerForWallet({
    walletAddress: address,
    factoryAddress: v2ClearingHouse?.factory,
    collateralAddress: v2ClearingHouse?.collateralAddress,
    debtAddress: v2ClearingHouse?.debtAddress,
    clearingHouseVersion: "clearingHouseV2",
  });
  const { data: v3CoolerAddress } = useGetCoolerForWallet({
    walletAddress: address,
    factoryAddress: v3ClearingHouse?.factory,
    collateralAddress: v3ClearingHouse?.collateralAddress,
    debtAddress: v3ClearingHouse?.debtAddress,
    clearingHouseVersion: "clearingHouseV3",
  });

  // Fetch loans for each version
  const { data: v1Loans = [], isLoading: isV1LoansLoading } = useGetCoolerLoans({
    walletAddress: address,
    factoryAddress: v1ClearingHouse?.factory,
    collateralAddress: v1ClearingHouse?.collateralAddress,
    debtAddress: v1ClearingHouse?.debtAddress,
  });
  const { data: v2Loans = [], isLoading: isV2LoansLoading } = useGetCoolerLoans({
    walletAddress: address,
    factoryAddress: v2ClearingHouse?.factory,
    collateralAddress: v2ClearingHouse?.collateralAddress,
    debtAddress: v2ClearingHouse?.debtAddress,
  });
  const { data: v3Loans = [], isLoading: isV3LoansLoading } = useGetCoolerLoans({
    walletAddress: address,
    factoryAddress: v3ClearingHouse?.factory,
    collateralAddress: v3ClearingHouse?.collateralAddress,
    debtAddress: v3ClearingHouse?.debtAddress,
  });

  const allLoans = useMemo(() => [...v1Loans, ...v2Loans, ...v3Loans], [v1Loans, v2Loans, v3Loans]);
  const isLoading =
    isV1CHLoading ||
    isV2CHLoading ||
    isV3CHLoading ||
    isV1LoansLoading ||
    isV2LoansLoading ||
    isV3LoansLoading;

  // Modal state
  const [repayLoan, setRepayLoan] = useState<CoolerLoan | null>(null);
  const [extendLoan, setExtendLoan] = useState<CoolerLoan | null>(null);
  const [isMigrateOpen, setIsMigrateOpen] = useState(false);

  // Determine cooler address, clearing house, and version for a given loan
  const getCoolerForLoan = (
    loan: CoolerLoan,
  ): {
    coolerAddress: string;
    clearingHouseData: typeof v1ClearingHouse;
    version: ClearingHouseVersion;
  } => {
    if (v1Loans.includes(loan))
      return {
        coolerAddress: v1CoolerAddress ?? "",
        clearingHouseData: v1ClearingHouse,
        version: "clearingHouseV1",
      };
    if (v2Loans.includes(loan))
      return {
        coolerAddress: v2CoolerAddress ?? "",
        clearingHouseData: v2ClearingHouse,
        version: "clearingHouseV2",
      };
    return {
      coolerAddress: v3CoolerAddress ?? "",
      clearingHouseData: v3ClearingHouse,
      version: "clearingHouseV3",
    };
  };

  const repayContext = repayLoan ? getCoolerForLoan(repayLoan) : null;
  const extendContext = extendLoan ? getCoolerForLoan(extendLoan) : null;

  return (
    <div data-slot="cooler-v1-page" className="space-y-6">
      <V1StatsBar clearingHouseData={activeClearingHouse} loans={allLoans} isLoading={isLoading} />

      {allLoans.length > 0 && (
        <div className="flex">
          <Button onClick={() => setIsMigrateOpen(true)}>Migrate Loans to Cooler V2</Button>
        </div>
      )}

      <V1LoansTable
        loans={allLoans}
        onRepay={setRepayLoan}
        onExtend={setExtendLoan}
        isLoading={isLoading}
      />

      <V1RepayLegacyModal
        isOpen={!!repayLoan}
        onClose={() => setRepayLoan(null)}
        loan={repayLoan}
        coolerAddress={repayContext?.coolerAddress ?? ""}
        debtAddress={repayContext?.clearingHouseData?.debtAddress ?? ""}
        clearingHouseData={repayContext?.clearingHouseData ?? null}
      />

      <V1ExtendLoanModal
        isOpen={!!extendLoan}
        onClose={() => setExtendLoan(null)}
        loan={extendLoan}
        coolerAddress={extendContext?.coolerAddress ?? ""}
        debtAddress={extendContext?.clearingHouseData?.debtAddress ?? ""}
        clearingHouseAddress={extendContext?.clearingHouseData?.clearingHouseAddress ?? ""}
        debtAssetName={extendContext?.clearingHouseData?.debtAssetName ?? "DAI"}
        interestRate={extendContext?.clearingHouseData?.interestRate ?? "0"}
        duration={extendContext?.clearingHouseData?.duration ?? "0"}
        clearingHouseVersion={extendContext?.version ?? "clearingHouseV1"}
      />

      <V1MigrateModal
        isOpen={isMigrateOpen}
        onClose={() => setIsMigrateOpen(false)}
        v1CoolerAddress={v1CoolerAddress ?? ""}
        v2CoolerAddress={v2CoolerAddress ?? ""}
        v3CoolerAddress={v3CoolerAddress ?? ""}
        v1Loans={v1Loans}
        v2Loans={v2Loans}
        v3Loans={v3Loans}
      />
    </div>
  );
}
