import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isAddress, type Address, zeroAddress } from "viem";
import { useAccount, useChainId } from "wagmi";
import type { CoolerLoan } from "@/lib/hooks/cooler/useGetCoolerLoans";
import { useConsolidateCooler } from "@/lib/hooks/cooler/useConsolidateCooler";
import { useTokenAllowance } from "@/lib/hooks/useTokenAllowance";
import { useTokenApproval } from "@/lib/hooks/useTokenApproval";
import { getContractAddress, ContractName } from "@/lib/contracts";
import { formatAmount } from "../utils/format";

interface MigrateModalProps {
  isOpen: boolean;
  onClose: () => void;
  v1CoolerAddress: string;
  v2CoolerAddress: string;
  v3CoolerAddress: string;
  v1Loans: CoolerLoan[];
  v2Loans: CoolerLoan[];
  v3Loans: CoolerLoan[];
}

type MigrateVersion = "v1" | "v2" | "both";

export function MigrateModal({
  isOpen,
  onClose,
  v1CoolerAddress,
  v2CoolerAddress,
  v3CoolerAddress: _v3CoolerAddress,
  v1Loans,
  v2Loans,
  v3Loans: _v3Loans,
}: MigrateModalProps) {
  const { address } = useAccount();
  const chainId = useChainId();
  const [selectedVersion, setSelectedVersion] = useState<MigrateVersion>("both");
  const [showOwnerTransfer, setShowOwnerTransfer] = useState(false);
  const [newOwner, setNewOwner] = useState("");
  const [preview, setPreview] = useState<{ collateralAmount: bigint; borrowAmount: bigint } | null>(
    null,
  );

  const gohmAddress = getContractAddress(ContractName.GOHM, chainId);
  const migratorAddress = getContractAddress(ContractName.COOLER_V2_MIGRATOR, chainId);

  const {
    consolidate,
    previewConsolidate,
    isPending: isMigratePending,
    isMigratorAuthorized,
  } = useConsolidateCooler();

  const hasV1 = v1Loans.length > 0 && !!v1CoolerAddress;
  const hasV2 = v2Loans.length > 0 && !!v2CoolerAddress;

  const coolers = useMemo(() => {
    const result: Address[] = [];
    if ((selectedVersion === "v1" || selectedVersion === "both") && v1CoolerAddress) {
      result.push(v1CoolerAddress as Address);
    }
    if ((selectedVersion === "v2" || selectedVersion === "both") && v2CoolerAddress) {
      result.push(v2CoolerAddress as Address);
    }
    return result;
  }, [selectedVersion, v1CoolerAddress, v2CoolerAddress]);

  // Load preview when coolers change
  useEffect(() => {
    if (!isOpen || coolers.length === 0) {
      setPreview(null);
      return;
    }
    let cancelled = false;
    previewConsolidate(coolers)
      .then((result) => {
        if (!cancelled) setPreview(result);
      })
      .catch(() => {
        if (!cancelled) setPreview(null);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, coolers, previewConsolidate]);

  const { allowance: gohmAllowance, queryKey: gohmAllowanceQueryKey } = useTokenAllowance(
    gohmAddress ?? zeroAddress,
    address,
    migratorAddress ?? zeroAddress,
  );

  const { approve: approveGohm, isPending: isGohmApprovePending } = useTokenApproval();

  const needsGohmApproval = useMemo(() => {
    if (!gohmAllowance || !preview) return false;
    return gohmAllowance < preview.collateralAmount;
  }, [gohmAllowance, preview]);

  const handleApproveGohm = () => {
    if (!gohmAddress || !migratorAddress || !preview) return;
    approveGohm({
      tokenAddress: gohmAddress,
      spender: migratorAddress,
      amount: preview.collateralAmount,
      queryKey: gohmAllowanceQueryKey,
    });
  };

  const isNewOwnerValid = !showOwnerTransfer || !newOwner || isAddress(newOwner);

  const handleMigrate = () => {
    if (!address || coolers.length === 0) return;
    if (showOwnerTransfer && newOwner) {
      if (!isAddress(newOwner)) return;
      consolidate({
        coolers,
        newOwner: newOwner as Address,
        isAuthorized: isMigratorAuthorized,
      });
    } else {
      consolidate({
        coolers,
        newOwner: address,
        isAuthorized: isMigratorAuthorized,
      });
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setSelectedVersion("both");
      setShowOwnerTransfer(false);
      setNewOwner("");
      setPreview(null);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Migrate to Cooler V2</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {hasV1 && hasV2 && (
            <div>
              <label className="mb-1 block text-xs text-secondary-t" htmlFor="version">
                Select Version to Migrate
              </label>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={selectedVersion === "both" ? "default" : "secondary"}
                  onClick={() => setSelectedVersion("both")}
                >
                  Both
                </Button>
                <Button
                  size="sm"
                  variant={selectedVersion === "v1" ? "default" : "secondary"}
                  onClick={() => setSelectedVersion("v1")}
                >
                  V1 Only
                </Button>
                <Button
                  size="sm"
                  variant={selectedVersion === "v2" ? "default" : "secondary"}
                  onClick={() => setSelectedVersion("v2")}
                >
                  V2 Only
                </Button>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <h4 className="text-sm font-semibold">Consolidation Preview</h4>
            {preview ? (
              <div className="flex flex-col gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-secondary-t">Total Collateral</span>
                  <span>{formatAmount(preview.collateralAmount)} gOHM</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary-t">Total Borrow</span>
                  <span>{formatAmount(preview.borrowAmount)} USDS</span>
                </div>
              </div>
            ) : (
              <p className="text-secondary-t text-sm">Loading preview...</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <h4 className="text-sm font-semibold">Required Allowances</h4>
            <div className="flex flex-col gap-1 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-secondary-t">gOHM</span>
                <span>
                  {needsGohmApproval ? (
                    <span className="text-amber-500">Approval needed</span>
                  ) : (
                    <span className="text-green-500">Approved</span>
                  )}
                </span>
              </div>
            </div>
          </div>

          <div>
            <button
              type="button"
              className="text-sm text-secondary-t hover:text-primary-t transition-colors cursor-pointer"
              onClick={() => setShowOwnerTransfer(!showOwnerTransfer)}
            >
              {showOwnerTransfer ? "Hide" : "Show"} Ownership Transfer (Optional)
            </button>
            {showOwnerTransfer && (
              <div className="mt-2">
                <label className="mb-1 block text-xs text-secondary-t" htmlFor="newOwner">
                  New Owner Address
                </label>
                <Input
                  type="text"
                  placeholder="0x..."
                  value={newOwner}
                  onChange={(e) => setNewOwner(e.target.value)}
                />
                {newOwner && !isAddress(newOwner) && (
                  <p className="mt-1 text-xs text-red-500">Invalid Ethereum address.</p>
                )}
                <p className="mt-1 text-xs text-tertiary-t">
                  Transfer ownership of the migrated position to a different address.
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            {needsGohmApproval ? (
              <Button onClick={handleApproveGohm} disabled={isGohmApprovePending || !preview}>
                {isGohmApprovePending ? "Approving..." : "Approve gOHM"}
              </Button>
            ) : (
              <Button
                onClick={handleMigrate}
                disabled={isMigratePending || coolers.length === 0 || !preview || !isNewOwnerValid}
              >
                {isMigratePending ? "Migrating..." : "Migrate"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
