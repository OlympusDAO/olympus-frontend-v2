import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { NumberFlow } from "@/components/ui/number-flow";
import { TooltipInfo } from "@/components/ui/tooltip";
import { ChainIcon } from "@/components/chain-icon";
import { useLpPoolsData } from "@/modules/pulse/hooks/useLpPoolsData";

const COMPACT_USD = {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
} as const;
const PERCENT_FORMAT = {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
} as const;

function stripLpSuffix(name: string): string {
  return name.replace(/ Liquidity Pool$/i, "").replace(/ LP$/i, "");
}

const SKELETON_ROWS = [
  "skeleton-row-1",
  "skeleton-row-2",
  "skeleton-row-3",
  "skeleton-row-4",
  "skeleton-row-5",
];
const SKELETON_CELLS = [
  "skeleton-cell-1",
  "skeleton-cell-2",
  "skeleton-cell-3",
  "skeleton-cell-4",
  "skeleton-cell-5",
  "skeleton-cell-6",
  "skeleton-cell-7",
  "skeleton-cell-8",
];

export function TreasuryPolTable() {
  const { data: rows, isLoading } = useLpPoolsData();

  const totalTvl = useMemo(() => (rows ?? []).reduce((s, r) => s + r.tvl, 0), [rows]);
  const totalFees = useMemo(
    () => (rows ?? []).reduce((s, r) => s + (r.weeklyFees ?? 0), 0),
    [rows],
  );
  const hasUnavailableFees = useMemo(() => (rows ?? []).some((r) => r.weeklyFees == null), [rows]);
  const totalOhmDepth = useMemo(() => (rows ?? []).reduce((s, r) => s + r.ohmDepth, 0), [rows]);

  return (
    <Card className="flex flex-col gap-4 p-5">
      <div>
        <h3 className="text-[18px]/[20px] font-semibold">Protocol-Owned Liquidity</h3>
        <p className="mt-1 text-xs text-secondary-t">
          Dedicated view for Olympus-owned liquidity positions, separated from the balance sheet.
          Fees are APY-derived estimates, not observed collections.
        </p>
      </div>

      <Separator />

      <div className="overflow-hidden">
        <table className="w-full table-fixed text-sm">
          <thead>
            <tr className="border-b border-a10-b">
              <th className="w-[18%] pb-2 text-left text-xs font-normal text-secondary-t">Pool</th>
              <th className="w-[12%] pb-2 text-left text-xs font-normal text-secondary-t">
                Protocol
              </th>
              <th className="w-[10%] pb-2 text-left text-xs font-normal text-secondary-t">Chain</th>
              <th className="w-[12%] pb-2 pr-3 text-right text-xs font-normal text-secondary-t">
                TVL
              </th>
              <th className="w-[14%] pb-2 pr-3 text-xs font-normal text-secondary-t">
                <div className="flex justify-end -mr-3">
                  <TooltipInfo
                    className="font-normal"
                    title="Estimated weekly fee run-rate derived from fee APY and Olympus-owned LP value. This is not observed fees collected by Olympus over the last 7 days."
                  >
                    Estimated Fees
                  </TooltipInfo>
                </div>
              </th>
              <th className="w-[10%] pb-2 pr-3 text-right text-xs font-normal text-secondary-t">
                % of POL
              </th>
              <th className="w-[10%] pb-2 pr-3 text-right text-xs font-normal text-secondary-t">
                OHM %
              </th>
              <th className="w-[14%] pb-2 text-right text-xs font-normal text-secondary-t">
                OHM Depth
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              SKELETON_ROWS.map((rowKey) => (
                <tr key={rowKey} className="border-b border-a5-b last:border-0">
                  {SKELETON_CELLS.map((cellKey) => (
                    <td key={cellKey} className="py-2 pr-3">
                      <Skeleton className="h-4 w-20 rounded-md" />
                    </td>
                  ))}
                </tr>
              ))
            ) : (rows ?? []).length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="py-12 text-center text-sm/5 font-semibold text-secondary-t"
                >
                  No LP positions found
                </td>
              </tr>
            ) : (
              (rows ?? []).map((row) => {
                const pct = totalTvl > 0 ? row.tvl / totalTvl : 0;
                return (
                  <tr
                    key={`${row.name}-${row.protocol}-${row.chainId}`}
                    className="border-b border-a5-b last:border-0"
                  >
                    <td className="py-2 pr-3">
                      <span className="line-clamp-1 text-xs font-semibold text-primary-t">
                        {stripLpSuffix(row.name)}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-xs text-secondary-t">{row.protocol}</td>
                    <td className="py-2 pr-3">
                      <ChainIcon chainId={row.chainId} size={16} />
                    </td>
                    <td className="py-2 pr-3 text-right text-xs font-semibold">
                      <NumberFlow value={row.tvl} format={COMPACT_USD} />
                    </td>
                    <td className="py-2 pr-3 text-right text-xs font-semibold">
                      {row.weeklyFees == null ? (
                        <span className="text-secondary-t">Unavailable</span>
                      ) : (
                        <NumberFlow value={row.weeklyFees} format={COMPACT_USD} />
                      )}
                    </td>
                    <td className="py-2 pr-3 text-right text-xs font-semibold">
                      <NumberFlow value={pct} format={PERCENT_FORMAT} />
                    </td>
                    <td className="py-2 pr-3 text-right text-xs font-semibold">
                      <NumberFlow value={row.ohmPct} format={PERCENT_FORMAT} />
                    </td>
                    <td className="py-2 text-right text-xs font-semibold">
                      <NumberFlow value={row.ohmDepth} format={COMPACT_USD} />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          {!isLoading && (rows ?? []).length > 0 ? (
            <tfoot>
              <tr className="border-t border-a10-b">
                <td colSpan={3} className="pt-2 text-xs font-bold text-primary-t">
                  Total
                </td>
                <td className="pt-2 pr-3 text-right text-xs font-bold text-primary-t">
                  <NumberFlow value={totalTvl} format={COMPACT_USD} />
                </td>
                <td className="pt-2 pr-3 text-right text-xs font-bold text-primary-t">
                  <div className="flex flex-col items-end gap-0.5">
                    <NumberFlow value={totalFees} format={COMPACT_USD} />
                    {hasUnavailableFees ? (
                      <TooltipInfo title="Partial total: excludes rows where fee APY data is unavailable.">
                        <span className="text-[10px]/3 font-semibold text-secondary-t">
                          Partial
                        </span>
                      </TooltipInfo>
                    ) : null}
                  </div>
                </td>
                <td className="pt-2 pr-3 text-right text-xs text-secondary-t">—</td>
                <td className="pt-2 pr-3 text-right text-xs text-secondary-t">—</td>
                <td className="pt-2 text-right text-xs font-bold text-primary-t">
                  <NumberFlow value={totalOhmDepth} format={COMPACT_USD} />
                </td>
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>
    </Card>
  );
}
