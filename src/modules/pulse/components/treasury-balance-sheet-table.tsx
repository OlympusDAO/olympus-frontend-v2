import { useMemo, useState } from "react";
import { RiArrowDownLine, RiArrowUpLine, RiExpandUpDownLine } from "@remixicon/react";
import { Card } from "@/components/ui/card.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { NumberFlow } from "@/components/ui/number-flow.tsx";
import { useTreasuryMetrics } from "@/modules/pulse/hooks/useTreasuryMetrics";
import { useReserveBalances } from "@/modules/pulse/hooks/useReserveBalances";
import { ProtocolDataSource } from "@/modules/pulse/components/protocol-data-source.tsx";
import { ChainIcon } from "@/components/chain-icon";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CHAIN_NAME_TO_ID } from "@/modules/ohm/utils/defi-llama";

const COMPACT_USD = {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
} as const;
const USD_PER_OHM = {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
} as const;
const ASSET_PAGE_SIZE = 8;

type AssetSortKey =
  | "token"
  | "category"
  | "blockchain"
  | "isLiquid"
  | "backingContribution"
  | "value";
type SortDirection = "asc" | "desc";

const CATEGORY_BADGE_COLOR: Record<
  string,
  "purple" | "red" | "blue" | "green" | "orange" | "gray"
> = {
  Stable: "green",
  Volatile: "orange",
  "Protocol-Owned Liquidity": "blue",
  "Stable LP": "green",
  "Non-Reserve": "gray",
};

function SortableHeader({
  label,
  sorted,
  numeric = false,
  onClick,
}: {
  label: string;
  sorted: false | "asc" | "desc";
  numeric?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center gap-1",
        numeric && "justify-end",
        sorted && "text-primary-t",
      )}
      onClick={onClick}
    >
      {label}
      {sorted === "asc" ? (
        <RiArrowUpLine className="size-3" />
      ) : sorted === "desc" ? (
        <RiArrowDownLine className="size-3" />
      ) : (
        <RiExpandUpDownLine className="size-3" />
      )}
    </button>
  );
}

export function TreasuryBalanceSheetTable() {
  const [assetPage, setAssetPage] = useState(0);
  const [assetSort, setAssetSort] = useState<{ key: AssetSortKey; direction: SortDirection }>({
    key: "value",
    direction: "desc",
  });
  const { data: metrics } = useTreasuryMetrics();
  const { data: reserves } = useReserveBalances();

  const ohmBackedSupply = metrics?.ohmBackedSupply ?? 0;
  const holdings = reserves?.holdings ?? [];

  const assetRows = useMemo(
    () =>
      [...holdings]
        .filter((h) => h.value > 1)
        .filter((h) => h.category !== "Protocol-Owned Liquidity")
        .sort((a, b) => {
          const direction = assetSort.direction === "asc" ? 1 : -1;
          if (assetSort.key === "value") return (a.value - b.value) * direction;
          if (assetSort.key === "backingContribution") {
            return (a.backingContribution - b.backingContribution) * direction;
          }
          if (assetSort.key === "isLiquid") {
            return (Number(a.isLiquid) - Number(b.isLiquid)) * direction;
          }

          return a[assetSort.key].localeCompare(b[assetSort.key]) * direction;
        }),
    [holdings, assetSort],
  );

  const handleAssetSort = (key: AssetSortKey) => {
    setAssetPage(0);
    setAssetSort((current) => ({
      key,
      direction: current.key === key && current.direction === "desc" ? "asc" : "desc",
    }));
  };
  const getSortState = (key: AssetSortKey) => (assetSort.key === key ? assetSort.direction : false);
  const totalAssetPages = Math.max(1, Math.ceil(assetRows.length / ASSET_PAGE_SIZE));
  const currentAssetPage = Math.min(assetPage, totalAssetPages - 1);
  const pagedAssetRows = assetRows.slice(
    currentAssetPage * ASSET_PAGE_SIZE,
    currentAssetPage * ASSET_PAGE_SIZE + ASSET_PAGE_SIZE,
  );

  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[18px]/[20px] font-semibold">Balance Sheet</h3>
          <p className="mt-1 text-xs text-secondary-t">
            All treasury holdings excluding Protocol-Owned Liquidity, with backing contribution per
            OHM.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2 text-[11px] text-secondary-t">
          <button
            type="button"
            className="rounded-lg border border-a10-b px-2 py-1 font-semibold text-primary-t transition-colors hover:bg-surface-a5 disabled:cursor-not-allowed disabled:opacity-35"
            disabled={currentAssetPage === 0}
            onClick={() => setAssetPage((p) => Math.max(0, p - 1))}
          >
            Prev
          </button>
          <span>
            {currentAssetPage + 1}/{totalAssetPages}
          </span>
          <button
            type="button"
            className="rounded-lg border border-a10-b px-2 py-1 font-semibold text-primary-t transition-colors hover:bg-surface-a5 disabled:cursor-not-allowed disabled:opacity-35"
            disabled={currentAssetPage >= totalAssetPages - 1}
            onClick={() => setAssetPage((p) => Math.min(totalAssetPages - 1, p + 1))}
          >
            Next
          </button>
        </div>
      </div>

      <Separator />

      <div className="-mx-5 overflow-x-auto px-5">
        <table className="w-full min-w-[640px] table-fixed text-sm">
          <thead>
            <tr className="border-b border-a10-b">
              <th className="w-[24%] pb-2 text-left text-xs font-normal text-secondary-t">
                <SortableHeader
                  label="Holding"
                  sorted={getSortState("token")}
                  onClick={() => handleAssetSort("token")}
                />
              </th>
              <th className="w-[20%] pb-2 text-left text-xs font-normal text-secondary-t">
                <SortableHeader
                  label="Category"
                  sorted={getSortState("category")}
                  onClick={() => handleAssetSort("category")}
                />
              </th>
              <th className="w-[14%] pb-2 text-left text-xs font-normal text-secondary-t">
                <SortableHeader
                  label="Chain"
                  sorted={getSortState("blockchain")}
                  onClick={() => handleAssetSort("blockchain")}
                />
              </th>
              <th className="w-[10%] pb-2 pl-3 text-left text-xs font-normal text-secondary-t">
                <SortableHeader
                  label="Liquid"
                  sorted={getSortState("isLiquid")}
                  onClick={() => handleAssetSort("isLiquid")}
                />
              </th>
              <th className="w-[16%] pb-2 text-right text-xs font-normal text-secondary-t">
                <SortableHeader
                  label="Backing / OHM"
                  sorted={getSortState("backingContribution")}
                  numeric
                  onClick={() => handleAssetSort("backingContribution")}
                />
              </th>
              <th className="w-[16%] pb-2 text-right text-xs font-normal text-secondary-t">
                <SortableHeader
                  label="Value"
                  sorted={getSortState("value")}
                  numeric
                  onClick={() => handleAssetSort("value")}
                />
              </th>
            </tr>
          </thead>
          <tbody>
            {pagedAssetRows.map((row) => (
              <tr
                key={`${row.token}-${row.blockchain}-${row.category}`}
                className="border-b border-a5-b last:border-0"
              >
                <td className="py-2 pr-3">
                  <span className="line-clamp-1 text-xs font-semibold text-primary-t">
                    {row.token}
                  </span>
                </td>
                <td className="py-2 pr-3">
                  <Badge color={CATEGORY_BADGE_COLOR[row.category] ?? "gray"}>{row.category}</Badge>
                </td>
                <td className="py-2 pr-3">
                  <div className="flex min-w-0 items-center gap-1.5 text-xs text-secondary-t">
                    {CHAIN_NAME_TO_ID[row.blockchain] ? (
                      <ChainIcon chainId={CHAIN_NAME_TO_ID[row.blockchain]} size={16} />
                    ) : null}
                    <span className="truncate">{row.blockchain}</span>
                  </div>
                </td>
                <td className="py-2 pr-3 pl-3 text-xs font-semibold text-primary-t">
                  {row.isLiquid ? "Yes" : "No"}
                </td>
                <td className="py-2 pr-3 text-right text-xs font-semibold">
                  <NumberFlow
                    value={ohmBackedSupply > 0 ? row.backingContribution / ohmBackedSupply : 0}
                    format={USD_PER_OHM}
                  />
                </td>
                <td className="py-2 text-right text-xs font-semibold">
                  <NumberFlow value={row.value} format={COMPACT_USD} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ProtocolDataSource sources={["Treasury API", "DeFiLlama"]} className="pt-0" />
    </Card>
  );
}
