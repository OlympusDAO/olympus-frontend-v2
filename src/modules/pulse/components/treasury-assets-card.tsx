import { useMemo, useState } from "react";
import { PieChart, Pie, Cell, Tooltip } from "recharts";
import { Card } from "@/components/ui/card.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { NumberFlow } from "@/components/ui/number-flow.tsx";
import { useTreasuryMetrics } from "@/modules/pulse/hooks/useTreasuryMetrics";
import { useReserveBalances } from "@/modules/pulse/hooks/useReserveBalances";
import { useReserveYields } from "@/modules/pulse/hooks/useReserveYields";
import { useCoolerMetrics } from "@/modules/pulse/hooks/useCoolerMetrics";
import { TooltipInfo } from "@/components/ui/tooltip.tsx";
import { ProtocolDataSource } from "@/modules/pulse/components/protocol-data-source.tsx";
import { ChainIcon } from "@/components/chain-icon";
import { cn } from "@/lib/utils";
import { CHAIN_NAME_TO_ID } from "@/modules/ohm/utils/defi-llama";

const PERCENT_FORMAT = {
  style: "decimal",
  minimumFractionDigits: 1,
  maximumFractionDigits: 2,
} as const;
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
      className={cn("inline-flex items-center gap-1", numeric && "justify-end")}
      onClick={onClick}
    >
      {label}
      <span className={cn("text-disabled-t", sorted && "text-primary-t")}>
        {sorted === "asc" ? "▲" : sorted === "desc" ? "▼" : "↕"}
      </span>
    </button>
  );
}

const CATEGORY_COLORS: Record<string, string> = {
  Stable: "var(--olympus-chart-1)",
  Volatile: "var(--olympus-chart-3)",
  "Protocol-Owned Liquidity": "var(--olympus-chart-2)",
  "Stable LP": "var(--olympus-chart-4)",
  "Non-Reserve": "var(--olympus-chart-5)",
};

interface Slice {
  name: string;
  value: number;
  color: string;
  apy: number | null;
}

function buildSlices(
  coolerBorrowed: number,
  coolerApy: number,
  susdeValue: number,
  susdeApy: number,
  susdsValue: number,
  susdsApy: number,
  lpTotal: number,
  lpApy: number | null,
): Slice[] {
  return [
    {
      name: "Cooler Loan Receivables",
      value: coolerBorrowed,
      color: "var(--olympus-chart-1)",
      apy: coolerApy,
    },
    { name: "sUSDe", value: susdeValue, color: "var(--olympus-chart-2)", apy: susdeApy },
    { name: "LP positions", value: lpTotal, color: "var(--olympus-chart-3)", apy: lpApy },
    { name: "sUSDS", value: susdsValue, color: "var(--olympus-chart-4)", apy: susdsApy },
  ].filter((s) => s.value > 0);
}

interface DonutEntry {
  name: string;
  value: number;
  total: number;
}

function DonutTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { name: string; value: number; payload: DonutEntry }[];
}) {
  if (!active || !payload?.[0]) return null;
  const entry = payload[0];
  const pct = entry.payload.total > 0 ? (entry.value / entry.payload.total) * 100 : 0;

  return (
    <div className="bg-surface-tooltip shadow-tooltip rounded-[20px] px-3 py-2 max-w-[216px] text-center text-primary-t">
      <p className="text-xs leading-4 font-normal">{entry.payload.name}</p>
      <p className="text-sm leading-5 font-semibold">
        <NumberFlow value={pct} format={PERCENT_FORMAT} suffix="%" />
      </p>
    </div>
  );
}

export function TreasuryAssetsCard() {
  const [assetPage, setAssetPage] = useState(0);
  const [assetSort, setAssetSort] = useState<{ key: AssetSortKey; direction: SortDirection }>({
    key: "value",
    direction: "desc",
  });
  const { data: metrics } = useTreasuryMetrics();
  const { data: reserves } = useReserveBalances();
  const { data: yields } = useReserveYields();
  const { data: cooler } = useCoolerMetrics();

  const treasuryMarketValue = metrics?.treasuryMarketValue ?? 0;
  const ohmBackedSupply = metrics?.ohmBackedSupply ?? 0;
  const coolerBorrowed = cooler ? cooler.monoDebt + cooler.v1Principal + cooler.v1Interest : 0;
  const coolerApy = cooler?.interestRate ?? 0;
  const susdeValue = reserves?.susdeValue ?? 0;
  const susdeApy = yields?.susdeApy ?? 0;
  const susdsValue = reserves?.susdsValue ?? 0;
  const susdsApy = yields?.susdsApy ?? 0;
  const lpPositions = reserves?.lpPositions ?? [];
  const lpTotal = lpPositions.reduce((sum, p) => sum + p.value, 0);
  const lpWeightedApy =
    lpTotal > 0 && yields?.lpApys
      ? lpPositions.reduce((sum, p) => sum + p.value * (yields.lpApys[p.name] ?? 0), 0) / lpTotal
      : null;
  const freeReserves = treasuryMarketValue - coolerBorrowed;
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

  const slices = buildSlices(
    coolerBorrowed,
    coolerApy,
    susdeValue,
    susdeApy,
    susdsValue,
    susdsApy,
    lpTotal,
    lpWeightedApy,
  );

  const pieData = slices.map((s) => ({ ...s, total: treasuryMarketValue }));

  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-[18px]/[20px] font-semibold">Assets:</h3>
          <p className="mt-1 text-xs text-secondary-t">
            Major income-producing treasury positions. LP APY is the weighted fee APY across current
            Protocol Owned Liquidity.
          </p>
        </div>
        <div className="shrink-0 text-right">
          <TooltipInfo title="All protocol-owned assets at market value">
            <p className="text-xs font-normal text-secondary-t">Treasury Market Value</p>
          </TooltipInfo>
          <NumberFlow
            value={treasuryMarketValue}
            className="text-sm font-semibold [--number-flow-char-height:20px]"
          />
        </div>
      </div>

      <Separator />

      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-5 max-lg:grid-cols-1">
        <div className="shrink-0">
          <PieChart width={140} height={140}>
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              innerRadius={42}
              outerRadius={65}
              paddingAngle={1}
              stroke="var(--surface-bg-l2)"
              strokeWidth={2}
            >
              {pieData.map((s) => (
                <Cell key={s.name} fill={s.color} />
              ))}
            </Pie>
            <Tooltip content={<DonutTooltip />} />
          </PieChart>
        </div>

        <table className="min-w-0 w-full text-sm">
          <thead>
            <tr className="border-b border-a10-b">
              <th className="pb-2 text-left text-xs font-normal text-secondary-t">Reserve</th>
              <th className="pb-2 pr-4 text-right text-xs font-normal text-secondary-t">APY</th>
              <th className="pb-2 text-right text-xs font-normal text-secondary-t">Value</th>
            </tr>
          </thead>
          <tbody>
            {slices.map((s) => (
              <tr key={s.name}>
                <td className="py-1 pr-4">
                  <div className="flex items-center gap-1">
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: s.color }}
                    />
                    <span className="whitespace-nowrap font-semibold text-xs">{s.name}</span>
                  </div>
                </td>
                <td className="py-1 pr-4 text-right text-xs font-semibold ">
                  {s.apy !== null ? (
                    <NumberFlow value={s.apy} format={PERCENT_FORMAT} suffix="%" />
                  ) : (
                    "–"
                  )}
                </td>
                <td className="py-1 text-right text-xs font-semibold">
                  <NumberFlow value={s.value} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Separator />

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-primary-t">Balance Sheet:</p>
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

        <div className="overflow-hidden">
          <table className="w-full table-fixed text-sm">
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
                    <div className="flex min-w-0 items-center gap-1.5">
                      <span
                        className="size-2 shrink-0 rounded-full"
                        style={{
                          backgroundColor:
                            CATEGORY_COLORS[row.category] ?? "var(--olympus-chart-5)",
                        }}
                      />
                      <span className="truncate text-xs text-secondary-t">{row.category}</span>
                    </div>
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
      </div>

      <Separator />
      <div className="flex items-center justify-between gap-4">
        <TooltipInfo title="Treasury Market Value less outstanding Cooler loan receivables">
          <p className="text-primary-t text-sm font-semibold">Free Reserves</p>
        </TooltipInfo>
        <NumberFlow
          value={freeReserves}
          className="shrink-0 text-sm font-semibold [--number-flow-char-height:20px]"
        />
      </div>

      <ProtocolDataSource sources={["Treasury API", "DeFiLlama", "Cooler Subgraph"]} />
    </Card>
  );
}
