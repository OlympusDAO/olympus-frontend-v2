import { useState, useMemo } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Button } from "@/components/ui/button.tsx";
import { CircularProgress } from "@/components/ui/circular-progress.tsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import { RiMoreFill } from "@remixicon/react";
import { Icon } from "@/components/icon.tsx";
import { useAccount, useChainId, useReadContracts } from "wagmi";
import { useUserRedemptions } from "@/lib/hooks/cds/useUserRedemptions.ts";
import DepositRedemptionVaultABI from "@/abis/DepositRedemptionVault.ts";
import { getContractAddress, ContractName } from "@/lib/contracts.ts";
import { formatEther } from "viem";
import { formatTermSuffix } from "@/lib/utils.ts";
import { Spinner } from "@/components/spinner.tsx";
import { BorrowRepayLoanModal } from "./borrow-repay-loan-modal.tsx";
import { BorrowExtendLoanModal } from "./borrow-extend-loan-modal.tsx";

// ─── Types ────────────────────────────────────────────────────────────────────

type Loan = {
  initialPrincipal: bigint;
  principal: bigint;
  interest: bigint;
  dueDate: number;
  isDefaulted: boolean;
};

type LoanWithRedemption = {
  redemptionId: number;
  debt: string;
  debtUSD: string;
  principal: string;
  interest: string;
  collateral: string;
  collateralToken: string;
  collateralUSD: string;
  borrowAPY: string;
  depositToken: `0x${string}`;
  depositPeriod: number;
  facility: `0x${string}`;
  dueDate: number;
  ltv: number;
};

// ─── Column helper ────────────────────────────────────────────────────────────

const columnHelper = createColumnHelper<LoanWithRedemption>();

// ─── Cell components ──────────────────────────────────────────────────────────

const DebtCell = ({ loan }: { loan: LoanWithRedemption }) => (
  <div className="flex items-center gap-2">
    <Icon name="USDSColorTokenIcon" size={32} />
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-semibold whitespace-nowrap">{loan.debt} USDS</span>
      <span className="text-xs font-normal text-secondary-t">${loan.debtUSD}</span>
    </div>
  </div>
);

const CollateralCell = ({ loan }: { loan: LoanWithRedemption }) => (
  <div className="flex items-center gap-2">
    <Icon name="cdUSDSIcon" size={32} />
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-semibold whitespace-nowrap">
        {loan.collateral} {loan.collateralToken}
      </span>
      <span className="text-xs font-normal text-secondary-t">${loan.collateralUSD}</span>
    </div>
  </div>
);

const LTVCell = ({ ltv }: { ltv: number }) => {
  const indicatorColor = ltv >= 75 ? "text-red" : ltv >= 50 ? "text-orange" : "text-green";
  return (
    <div className="flex items-center gap-1.5">
      <CircularProgress
        value={Math.min(ltv, 100)}
        size={16}
        strokeWidth={2}
        trackColor="text-secondary/20"
        indicatorColor={indicatorColor}
      />
      <span className="text-xs font-semibold">{ltv.toFixed(0)}%</span>
    </div>
  );
};

const ExpirationCell = ({ dueDate, depositPeriod }: { dueDate: number; depositPeriod: number }) => {
  const now = Math.floor(Date.now() / 1000);
  const secondsRemaining = Math.max(0, dueDate - now);
  const daysRemaining = Math.floor(secondsRemaining / 86400);
  const totalDays = depositPeriod * 30;
  const progress =
    totalDays > 0 ? Math.max(0, Math.min(100, ((totalDays - daysRemaining) / totalDays) * 100)) : 0;
  const indicatorColor =
    progress >= 75 ? "text-red" : progress >= 50 ? "text-orange" : "text-green";
  const dueLabel = new Date(dueDate * 1000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return (
    <div className="flex items-center gap-2">
      <CircularProgress
        value={progress}
        size={16}
        strokeWidth={2}
        trackColor="text-secondary/20"
        indicatorColor={indicatorColor}
      />
      <div className="flex flex-col gap-0.5">
        <span className="text-xs font-semibold whitespace-nowrap">{daysRemaining} days</span>
        <span className="text-xs font-normal text-secondary-t">{dueLabel}</span>
      </div>
    </div>
  );
};

const ActionsCell = ({
  loan,
  onRepay,
  onExtend,
}: {
  loan: LoanWithRedemption;
  onRepay: (loan: LoanWithRedemption) => void;
  onExtend: (loan: LoanWithRedemption) => void;
}) => (
  <div className="flex items-center justify-end gap-2">
    <Button size="sm" onClick={() => onRepay(loan)}>
      Repay
    </Button>
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button size="sm" variant="secondary" className="size-8 p-0" />}>
        <RiMoreFill className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onExtend(loan)}>Extend</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
);

// ─── Main component ───────────────────────────────────────────────────────────

export const BorrowActiveLoans = () => {
  const { address: userAddress } = useAccount();
  const chainId = useChainId();

  const [selectedLoanData, setSelectedLoanData] = useState<LoanWithRedemption | null>(null);
  const [isRepayModalOpen, setIsRepayModalOpen] = useState(false);
  const [isExtendModalOpen, setIsExtendModalOpen] = useState(false);

  const { redemptions, isLoading: isLoadingRedemptionsReal } = useUserRedemptions(userAddress);
  const vaultAddress = getContractAddress(ContractName.DEPOSIT_REDEMPTION_VAULT, chainId);

  const loanContracts = useMemo(() => {
    if (!userAddress || !vaultAddress || redemptions.length === 0) return [];
    return redemptions.flatMap((redemption, index) => [
      {
        address: vaultAddress,
        abi: DepositRedemptionVaultABI,
        functionName: "getRedemptionLoan" as const,
        args: [userAddress, index] as const,
      },
      {
        address: vaultAddress,
        abi: DepositRedemptionVaultABI,
        functionName: "getAnnualInterestRate" as const,
        args: [redemption.depositToken, redemption.facility] as const,
      },
    ]);
  }, [userAddress, vaultAddress, redemptions]);

  const { data: loanData, isLoading: isLoadingLoansReal } = useReadContracts({
    contracts: loanContracts,
  });

  const loansWithDataReal: LoanWithRedemption[] = useMemo(() => {
    if (!loanData || redemptions.length === 0) return [];
    const loans: LoanWithRedemption[] = [];

    redemptions.forEach((redemption, index) => {
      const loanResult = loanData[index * 2];
      const interestRateResult = loanData[index * 2 + 1];

      if (loanResult?.status === "success" && interestRateResult?.status === "success") {
        const loan = loanResult.result as Loan;
        const interestRate = Number(interestRateResult.result as unknown as bigint);

        if (loan && loan.dueDate > 0 && loan.principal > 0) {
          const principalAmount = parseFloat(formatEther(loan.principal));
          const interestAmount = parseFloat(formatEther(loan.interest));
          const totalDebt = principalAmount + interestAmount;
          const collateralAmount = parseFloat(formatEther(redemption.amount));

          loans.push({
            redemptionId: index,
            debt: totalDebt.toFixed(2),
            debtUSD: totalDebt.toFixed(2),
            principal: principalAmount.toFixed(2),
            interest: interestAmount.toFixed(2),
            collateral: collateralAmount.toFixed(2),
            collateralToken: `cdUSDS-${formatTermSuffix(redemption.depositPeriod)}`,
            collateralUSD: collateralAmount.toFixed(2),
            borrowAPY: (interestRate / 100).toFixed(2),
            depositToken: redemption.depositToken,
            depositPeriod: redemption.depositPeriod,
            facility: redemption.facility,
            dueDate: loan.dueDate,
            ltv: collateralAmount > 0 ? (totalDebt / collateralAmount) * 100 : 0,
          });
        }
      }
    });

    return loans;
  }, [loanData, redemptions]);

  const loansWithData = loansWithDataReal;
  const isLoading = isLoadingRedemptionsReal || isLoadingLoansReal;

  const handleRepay = (loan: LoanWithRedemption) => {
    setSelectedLoanData(loan);
    setIsRepayModalOpen(true);
  };

  const handleExtend = (loan: LoanWithRedemption) => {
    setSelectedLoanData(loan);
    setIsExtendModalOpen(true);
  };

  const columns = useMemo(
    () => [
      columnHelper.display({
        id: "debt",
        header: "Debt",
        cell: ({ row }) => <DebtCell loan={row.original} />,
      }),
      columnHelper.display({
        id: "collateral",
        header: "Collateral",
        cell: ({ row }) => <CollateralCell loan={row.original} />,
      }),
      columnHelper.display({
        id: "ltv",
        header: "Loan-to-Value",
        cell: ({ row }) => <LTVCell ltv={row.original.ltv} />,
      }),
      columnHelper.display({
        id: "borrowAPY",
        header: "Borrow APY",
        cell: ({ row }) => <span className="text-xs font-semibold">{row.original.borrowAPY}%</span>,
      }),
      columnHelper.display({
        id: "expires",
        header: "Expires",
        cell: ({ row }) => (
          <ExpirationCell
            dueDate={row.original.dueDate}
            depositPeriod={row.original.depositPeriod}
          />
        ),
      }),
      columnHelper.display({
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <ActionsCell loan={row.original} onRepay={handleRepay} onExtend={handleExtend} />
        ),
      }),
    ],
    // handlers close over stable setState refs — no deps needed
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const table = useReactTable({
    data: loansWithData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.redemptionId.toString(),
  });

  return (
    <div className="mt-8">
      <h2 className="text-[20px]/[24px] font-semibold mb-3">Active Loans</h2>

      {isLoading ? (
        <Table>
          <TableBody>
            <TableRow className="hover:bg-transparent">
              <TableCell className="h-40 py-12 text-center align-middle text-sm/5 font-semibold text-secondary-t">
                <div className="flex flex-col items-center justify-center gap-2">
                  <Spinner className="size-8" />
                  <p className="text-sm/5 font-semibold text-secondary-t">Loading loans</p>
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      ) : loansWithData.length === 0 ? (
        <Table>
          <TableBody>
            <TableRow className="hover:bg-transparent">
              <TableCell className="h-40 py-12 text-center align-middle text-sm/5 font-semibold text-secondary-t">
                No active loans
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="block md:hidden space-y-3">
            {loansWithData.map((loan) => (
              <div key={loan.redemptionId} className="rounded-2xl border border-a5-b p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon name="USDSColorTokenIcon" size={32} />
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-semibold">{loan.debt} USDS</span>
                      <span className="text-xs font-normal text-secondary-t">${loan.debtUSD}</span>
                    </div>
                  </div>
                  <span className="text-xs text-secondary-t">Debt</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon name="cdUSDSIcon" size={32} />
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-semibold">
                        {loan.collateral} {loan.collateralToken}
                      </span>
                      <span className="text-xs font-normal text-secondary-t">
                        ${loan.collateralUSD}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs text-secondary-t">Collateral</span>
                </div>

                <div className="flex items-center justify-between border-t border-a5-b pt-3">
                  <div className="flex items-center gap-3">
                    <div>
                      <span className="text-xs text-secondary-t">LTV</span>
                      <div className="mt-1">
                        <LTVCell ltv={loan.ltv} />
                      </div>
                    </div>
                    <div>
                      <span className="text-xs text-secondary-t">Borrow APY</span>
                      <div className="mt-1 text-xs font-semibold">{loan.borrowAPY}%</div>
                    </div>
                    <div>
                      <span className="text-xs text-secondary-t">Expires</span>
                      <div className="mt-1">
                        <ExpirationCell dueDate={loan.dueDate} depositPeriod={loan.depositPeriod} />
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="tertiary" onClick={() => handleExtend(loan)}>
                      Extend
                    </Button>
                    <Button size="sm" onClick={() => handleRepay(loan)}>
                      Repay
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        className={header.id === "actions" ? "text-right" : ""}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className={cell.column.id === "actions" ? "text-right" : ""}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      <BorrowRepayLoanModal
        isOpen={isRepayModalOpen}
        onClose={() => {
          setIsRepayModalOpen(false);
          setSelectedLoanData(null);
        }}
        redemptionId={selectedLoanData?.redemptionId ?? null}
        collateralAmount={selectedLoanData?.collateral || "0"}
        collateralToken={selectedLoanData?.collateralToken || "cdUSDS"}
      />

      <BorrowExtendLoanModal
        isOpen={isExtendModalOpen}
        onClose={() => {
          setIsExtendModalOpen(false);
          setSelectedLoanData(null);
        }}
        redemptionId={selectedLoanData?.redemptionId ?? null}
        collateralAmount={selectedLoanData?.collateral || "0"}
        collateralToken={selectedLoanData?.collateralToken || "cdUSDS"}
        principal={selectedLoanData?.principal || "0"}
        interest={selectedLoanData?.interest || "0"}
      />
    </div>
  );
};
