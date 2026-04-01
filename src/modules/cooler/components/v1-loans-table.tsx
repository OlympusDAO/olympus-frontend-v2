import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatUnits } from "viem";
import type { CoolerLoan } from "@/lib/hooks/cooler/useGetCoolerLoans";
import { formatAmount, formatDate } from "../utils/format";

interface V1LoansTableProps {
  loans: CoolerLoan[];
  onRepay: (loan: CoolerLoan) => void;
  onExtend: (loan: CoolerLoan) => void;
  isLoading: boolean;
}

function formatInterestRate(loan: CoolerLoan): string {
  const rate = Number(formatUnits(loan.request.interest, 16));
  return `${rate.toFixed(2)}%`;
}

export function V1LoansTable({ loans, onRepay, onExtend, isLoading }: V1LoansTableProps) {
  if (isLoading) {
    return (
      <Card data-slot="v1-loans-table" className="p-6">
        <h3 className="mb-4 text-lg font-semibold">My Loans</h3>
        <p className="text-secondary-t text-sm">Loading loans...</p>
      </Card>
    );
  }

  if (loans.length === 0) {
    return (
      <Card data-slot="v1-loans-table" className="p-6">
        <h3 className="mb-4 text-lg font-semibold">My Loans</h3>
        <p className="text-secondary-t text-sm">No loans found</p>
      </Card>
    );
  }

  return (
    <Card data-slot="v1-loans-table" className="p-6">
      <h3 className="mb-4 text-lg font-semibold">My Loans</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-a5-b border-b text-left">
              <th className="pb-3 pr-4 font-medium text-secondary-t">Collateral</th>
              <th className="pb-3 pr-4 font-medium text-secondary-t">Interest Rate</th>
              <th className="pb-3 pr-4 font-medium text-secondary-t">Repayment</th>
              <th className="pb-3 pr-4 font-medium text-secondary-t">Maturity Date</th>
              <th className="pb-3 font-medium text-secondary-t">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loans.map((loan) => {
              const repaymentTotal = loan.principal + loan.interestDue;
              return (
                <tr key={loan.loanId} className="border-a5-b border-b last:border-b-0">
                  <td className="py-4 pr-4">{formatAmount(loan.collateral)} gOHM</td>
                  <td className="py-4 pr-4">{formatInterestRate(loan)}</td>
                  <td className="py-4 pr-4">
                    {formatAmount(repaymentTotal)} {loan.debtAssetName}
                  </td>
                  <td className="py-4 pr-4">{formatDate(loan.expiry)}</td>
                  <td className="py-4">
                    <div className="flex gap-2">
                      <Button size="sm" variant="secondary" onClick={() => onRepay(loan)}>
                        Repay
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => onExtend(loan)}>
                        Extend
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
