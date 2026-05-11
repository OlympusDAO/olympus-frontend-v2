import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  isAddress,
  ContractFunctionRevertedError,
  BaseError,
  type Address,
  zeroAddress,
} from "viem";
import { useAccount, useChainId } from "wagmi";
import type { CoolerLoan } from "@/lib/hooks/cooler/useGetCoolerLoans";
import { useConsolidateCooler } from "@/lib/hooks/cooler/useConsolidateCooler";
import { useTokenAllowance } from "@/lib/hooks/useTokenAllowance";
import { useTokenApproval } from "@/lib/hooks/useTokenApproval";
import { getContractAddress, ContractName } from "@/lib/contracts";
import { Spinner } from "@/components/spinner";
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

type MigrateVersion = "v1" | "v2" | "v3" | "";

const LEGACY_LOANS_HINT =
  "Your cooler may contain loans from a deprecated clearinghouse. The migrator only supports coolers whose loans were all issued by clearinghouses currently registered on-chain.";

function parsePreviewError(err: unknown): {
  message: string;
  hint?: string;
} {
  if (err instanceof BaseError) {
    const reverted = err.walk((e) => e instanceof ContractFunctionRevertedError) as
      | ContractFunctionRevertedError
      | undefined;
    const errorName = reverted?.data?.errorName;
    if (errorName === "Params_InvalidCooler") {
      return {
        message: "Invalid cooler.",
        hint: LEGACY_LOANS_HINT,
      };
    }
    if (errorName === "Params_DuplicateCooler") {
      return { message: "Duplicate cooler in request." };
    }
    if (errorName === "Disabled") {
      return { message: "The migrator contract is currently disabled." };
    }
    if (reverted && !errorName) {
      return {
        message: "Preview reverted with no reason.",
        hint: LEGACY_LOANS_HINT,
      };
    }
    return { message: err.shortMessage };
  }
  if (err instanceof Error && err.message) {
    return { message: err.message.split("\n")[0] };
  }
  return { message: "Could not load preview." };
}

export function V1MigrateModal({
  isOpen,
  onClose,
  v1CoolerAddress,
  v2CoolerAddress,
  v3CoolerAddress,
  v1Loans,
  v2Loans,
  v3Loans,
}: MigrateModalProps) {
  const { address } = useAccount();
  const chainId = useChainId();

  const hasV1 = v1Loans.length > 0 && !!v1CoolerAddress;
  const hasV2 = v2Loans.length > 0 && !!v2CoolerAddress;
  const hasV3 = v3Loans.length > 0 && !!v3CoolerAddress;

  const availableVersions = useMemo(() => {
    const versions: MigrateVersion[] = [];
    if (hasV1) versions.push("v1");
    if (hasV2) versions.push("v2");
    if (hasV3) versions.push("v3");
    return versions;
  }, [hasV1, hasV2, hasV3]);

  const [selectedVersion, setSelectedVersion] = useState<MigrateVersion>("");
  const [showOwnerTransfer, setShowOwnerTransfer] = useState(false);
  const [newOwner, setNewOwner] = useState("");
  const [preview, setPreview] = useState<{ collateralAmount: bigint; borrowAmount: bigint } | null>(
    null,
  );
  const [previewError, setPreviewError] = useState<{ message: string; hint?: string } | null>(null);

  // Auto-select source when only one version is available
  useEffect(() => {
    if (availableVersions.length === 1 && selectedVersion === "") {
      setSelectedVersion(availableVersions[0]);
    }
  }, [availableVersions, selectedVersion]);

  const gohmAddress = getContractAddress(ContractName.GOHM, chainId);
  const migratorAddress = getContractAddress(ContractName.COOLER_V2_MIGRATOR, chainId);

  const {
    consolidate,
    previewConsolidate,
    isPending: isMigratePending,
    isMigratorAuthorized,
    isSmartContractWallet,
  } = useConsolidateCooler();

  const sourceCoolerAddress = useMemo(() => {
    if (selectedVersion === "v1") return v1CoolerAddress;
    if (selectedVersion === "v2") return v2CoolerAddress;
    if (selectedVersion === "v3") return v3CoolerAddress;
    return "";
  }, [selectedVersion, v1CoolerAddress, v2CoolerAddress, v3CoolerAddress]);

  const sourceLoans = useMemo(() => {
    if (selectedVersion === "v1") return v1Loans;
    if (selectedVersion === "v2") return v2Loans;
    if (selectedVersion === "v3") return v3Loans;
    return [];
  }, [selectedVersion, v1Loans, v2Loans, v3Loans]);

  // Load preview when source cooler changes
  useEffect(() => {
    if (!isOpen || !sourceCoolerAddress) {
      setPreview(null);
      setPreviewError(null);
      return;
    }
    let cancelled = false;
    setPreview(null);
    setPreviewError(null);
    previewConsolidate([sourceCoolerAddress as Address])
      .then((result) => {
        if (!cancelled) setPreview(result);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setPreviewError(parsePreviewError(err));
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, sourceCoolerAddress, previewConsolidate]);

  const { allowance: gohmAllowance, queryKey: gohmAllowanceQueryKey } = useTokenAllowance(
    gohmAddress ?? zeroAddress,
    address,
    migratorAddress ?? zeroAddress,
  );

  const { approve: approveGohm, isPending: isGohmApprovePending } = useTokenApproval();

  const needsGohmApproval = useMemo(() => {
    if (gohmAllowance === undefined || !preview) return false;
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

  const isNewOwnerValid =
    !showOwnerTransfer ||
    !newOwner ||
    (isAddress(newOwner) && newOwner.toLowerCase() !== address?.toLowerCase());

  const handleMigrate = () => {
    if (!address || !sourceCoolerAddress) return;
    const coolers = [sourceCoolerAddress as Address];
    const owner =
      showOwnerTransfer && newOwner && isAddress(newOwner) ? (newOwner as Address) : address;
    consolidate({
      coolers,
      newOwner: owner,
      isAuthorized: isMigratorAuthorized,
    });
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setSelectedVersion(availableVersions.length === 1 ? availableVersions[0] : "");
      setShowOwnerTransfer(false);
      setNewOwner("");
      setPreview(null);
      setPreviewError(null);
      onClose();
    }
  };

  const showVersionSelector = availableVersions.length > 1;
  const multisigNeedsAuth = isSmartContractWallet && !isMigratorAuthorized;
  const migrateButtonLabel = multisigNeedsAuth ? "Authorize Migrator" : "Migrate to Cooler V2";

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="w-full sm:max-w-md mx-auto p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="text-xl">Migrate to Cooler V2</DialogTitle>
        </DialogHeader>

        <div className="px-6 pb-6 space-y-4">
          {showVersionSelector && (
            <div className="bg-surface-a3 rounded-3xl p-4 border border-a3-b">
              <p className="text-sm font-medium mb-3">Source Clearinghouse</p>
              <div className="flex flex-wrap gap-2">
                {hasV1 && (
                  <Button
                    size="sm"
                    variant={selectedVersion === "v1" ? "default" : "secondary"}
                    onClick={() => setSelectedVersion("v1")}
                  >
                    V1 ({v1Loans.length})
                  </Button>
                )}
                {hasV2 && (
                  <Button
                    size="sm"
                    variant={selectedVersion === "v2" ? "default" : "secondary"}
                    onClick={() => setSelectedVersion("v2")}
                  >
                    V2 ({v2Loans.length})
                  </Button>
                )}
                {hasV3 && (
                  <Button
                    size="sm"
                    variant={selectedVersion === "v3" ? "default" : "secondary"}
                    onClick={() => setSelectedVersion("v3")}
                  >
                    V3 ({v3Loans.length})
                  </Button>
                )}
              </div>
            </div>
          )}

          {selectedVersion ? (
            <>
              <p className="text-xs text-secondary-t leading-relaxed">
                All selected loans will be repaid and migrated into a single Cooler V2 position.
                Cooler V2 loans are open-ended and accrue interest continuously, only paid when you
                repay.
              </p>

              <div className="bg-surface-a3 rounded-3xl p-4 border border-a3-b">
                <div className="flex flex-col gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-secondary-t">Loans to Consolidate</span>
                    <span>{sourceLoans.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-secondary-t">Total Collateral</span>
                    {preview ? (
                      <span>{formatAmount(preview.collateralAmount)} gOHM</span>
                    ) : previewError ? (
                      <span className="text-secondary-t">--</span>
                    ) : (
                      <Spinner className="size-4" />
                    )}
                  </div>
                  <div className="border-a5-b flex justify-between border-t pt-2 mt-1 font-semibold">
                    <span>New Principal</span>
                    {preview ? (
                      <span>{formatAmount(preview.borrowAmount)} USDS</span>
                    ) : previewError ? (
                      <span className="text-secondary-t">--</span>
                    ) : (
                      <Spinner className="size-4" />
                    )}
                  </div>
                </div>
                {previewError && (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs text-red">Preview failed: {previewError.message}</p>
                    {previewError.hint && (
                      <p className="text-xs text-secondary-t">{previewError.hint}</p>
                    )}
                    {sourceCoolerAddress && (
                      <p className="text-xs text-secondary-t break-all">
                        Cooler: {sourceCoolerAddress}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div>
                <button
                  type="button"
                  className="text-sm text-secondary-t hover:text-primary-t transition-colors cursor-pointer"
                  onClick={() => setShowOwnerTransfer(!showOwnerTransfer)}
                >
                  {showOwnerTransfer ? "Hide" : "Transfer ownership to a different address"}
                </button>
                {showOwnerTransfer && (
                  <div className="mt-3 bg-surface-a3 rounded-3xl p-4 border border-a3-b">
                    <label className="text-sm font-medium block mb-2" htmlFor="newOwner">
                      New Owner Address
                    </label>
                    <Input
                      id="newOwner"
                      type="text"
                      placeholder="0x..."
                      value={newOwner}
                      onChange={(e) => setNewOwner(e.target.value)}
                    />
                    {newOwner && !isAddress(newOwner) && (
                      <p className="mt-2 text-xs text-red">Invalid Ethereum address.</p>
                    )}
                    {newOwner &&
                      isAddress(newOwner) &&
                      newOwner.toLowerCase() === address?.toLowerCase() && (
                        <p className="mt-2 text-xs text-red">
                          New owner cannot be the current owner.
                        </p>
                      )}
                  </div>
                )}
              </div>

              {needsGohmApproval ? (
                <Button
                  onClick={handleApproveGohm}
                  disabled={isGohmApprovePending || !preview}
                  className="w-full"
                  size="lg"
                >
                  {isGohmApprovePending ? "Approving..." : "Approve gOHM"}
                </Button>
              ) : (
                <Button
                  onClick={handleMigrate}
                  disabled={
                    isMigratePending || !sourceCoolerAddress || !preview || !isNewOwnerValid
                  }
                  className="w-full"
                  size="lg"
                >
                  {isMigratePending ? "Migrating..." : migrateButtonLabel}
                </Button>
              )}
            </>
          ) : (
            <Button disabled className="w-full" size="lg">
              Select a source clearinghouse
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
