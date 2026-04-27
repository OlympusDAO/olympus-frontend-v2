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

const PERCENT_FORMAT = {
  style: "decimal",
  minimumFractionDigits: 1,
  maximumFractionDigits: 2,
} as const;

interface Slice {
  name: string;
  value: number;
  color: string;
  apy: number | null;
}

function buildSlices(
  treasuryMarketValue: number,
  coolerBorrowed: number,
  coolerApy: number,
  susdeValue: number,
  susdeApy: number,
  susdsValue: number,
  susdsApy: number,
  lpTotal: number,
): Slice[] {
  const other = Math.max(
    0,
    treasuryMarketValue - coolerBorrowed - susdeValue - susdsValue - lpTotal,
  );

  return [
    { name: "USDS (Cooler Loans)", value: coolerBorrowed, color: "#8979FF", apy: coolerApy },
    { name: "sUSDe (yield-bearing)", value: susdeValue, color: "#F87171", apy: susdeApy },
    { name: "LP positions", value: lpTotal, color: "#22D3EE", apy: null },
    { name: "sUSDS (yield-bearing)", value: susdsValue, color: "#F59E0B", apy: susdsApy },
    { name: "Other", value: other, color: "#34D399", apy: null },
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
  const { data: metrics } = useTreasuryMetrics();
  const { data: reserves } = useReserveBalances();
  const { data: yields } = useReserveYields();
  const { data: cooler } = useCoolerMetrics();

  const treasuryMarketValue = metrics?.treasuryMarketValue ?? 0;
  const coolerBorrowed = cooler?.totalBorrowed ?? 0;
  const coolerApy = cooler?.interestRate ?? 0;
  const susdeValue = reserves?.susdeValue ?? 0;
  const susdeApy = yields?.susdeApy ?? 0;
  const susdsValue = reserves?.susdsValue ?? 0;
  const susdsApy = yields?.susdsApy ?? 0;
  const lpTotal = (reserves?.lpPositions ?? []).reduce((sum, p) => sum + p.value, 0);
  const freeReserves = treasuryMarketValue - coolerBorrowed;

  const slices = buildSlices(
    treasuryMarketValue,
    coolerBorrowed,
    coolerApy,
    susdeValue,
    susdeApy,
    susdsValue,
    susdsApy,
    lpTotal,
  );

  const pieData = slices.map((s) => ({ ...s, total: treasuryMarketValue }));

  return (
    <Card className="flex flex-col gap-4 p-5">
      <h3 className="text-[18px]/[20px] font-semibold">Assets</h3>

      <Separator />

      <div className="flex items-center justify-between">
        <TooltipInfo title="All protocol-owned assets at market value">
          <p className="text-primary-t text-sm font-semibold">Treasury Market Value</p>
        </TooltipInfo>

        <NumberFlow
          value={treasuryMarketValue}
          className="text-sm font-semibold [--number-flow-char-height:20px]"
        />
      </div>

      <div className="flex items-start gap-4">
        <div className="shrink-0">
          <PieChart width={140} height={140}>
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              innerRadius={42}
              outerRadius={65}
              paddingAngle={2}
              strokeWidth={0}
            >
              {pieData.map((s) => (
                <Cell key={s.name} fill={s.color} />
              ))}
            </Pie>
            <Tooltip content={<DonutTooltip />} />
          </PieChart>
        </div>

        <table className="flex-1 text-sm min-w-0 w-full">
          <thead>
            <tr className="border-b border-a10-b">
              <th className="pb-2 text-left text-xs font-normal text-secondary-t">Asset</th>
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
                      className="size-3 shrink-0 rounded-full"
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

      <div className="flex items-center justify-between gap-4">
        <TooltipInfo title="Stables & LP positions (available without recalling loans)">
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
