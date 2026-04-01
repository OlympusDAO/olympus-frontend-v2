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
    { name: "USDS (Cooler Loans)", value: coolerBorrowed, color: "#7C6AF6", apy: coolerApy },
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
    <div className="bg-surface-tooltip shadow-tooltip rounded-[20px] px-3 py-2 text-sm">
      <p className="font-medium">{entry.payload.name}</p>
      <p className="text-secondary-t">
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

  // Attach total to each slice for tooltip %
  const pieData = slices.map((s) => ({ ...s, total: treasuryMarketValue }));

  return (
    <Card className="flex flex-col gap-4 p-6">
      <h3 className="text-[18px]/[20px] font-semibold">Assets</h3>

      <Separator />

      {/* Treasury Market Value row */}
      <div className="flex items-center justify-between">
        <TooltipInfo title="Treasury Market Value">
          <p className="text-primary-t text-sm">Treasury Market Value</p>
        </TooltipInfo>

        <NumberFlow value={treasuryMarketValue} className="text-base font-semibold" />
      </div>

      {/* Donut + table */}
      <div className="flex items-start gap-6 overflow-x-auto">
        <div className="shrink-0">
          <PieChart width={180} height={180}>
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              innerRadius={55}
              outerRadius={85}
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

        <table className="flex-1 text-sm" style={{ minWidth: "260px" }}>
          <thead>
            <tr className="border-b border-a10-b">
              <th className="pb-2 text-left text-xs font-normal text-secondary-t">Asset</th>
              <th className="pb-2 text-right text-xs font-normal text-secondary-t">APY</th>
              <th className="pb-2 text-right text-xs font-normal text-secondary-t">Value</th>
            </tr>
          </thead>
          <tbody>
            {slices.map((s) => (
              <tr key={s.name}>
                <td className=" pr-4">
                  <div className="flex items-center gap-1">
                    <span
                      className="size-3 shrink-0 rounded-full"
                      style={{ backgroundColor: s.color }}
                    />
                    <span className="whitespace-nowrap font-semibold text-xs">{s.name}</span>
                  </div>
                </td>
                <td className="py-2 pr-4 text-right text-xs font-semibold ">
                  {s.apy !== null ? (
                    <NumberFlow value={s.apy} format={PERCENT_FORMAT} suffix="%" />
                  ) : (
                    "–"
                  )}
                </td>
                <td className="py-2 text-right text-xs font-semibold">
                  <NumberFlow value={s.value} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Separator />

      {/* Free Reserves */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-bold">Free Reserves</p>
          <p className="text-secondary-t text-xs">
            Stables &amp; LP positions (available without recalling loans)
          </p>
        </div>
        <NumberFlow value={freeReserves} className="shrink-0 text-base font-semibold" />
      </div>

      <Separator />

      {/* Description */}
      <blockquote className="border-l-2 border-amber-400 pl-4 text-xs font-semibold">
        The Olympus treasury manages protocol assets primarily consisting of stables, LP positions
        and the Cooler loan book. All assets back OHM, except for the OHM side of LP positions to
        prevent OHM backing itself.
      </blockquote>

      <ProtocolDataSource sources={["Treasury API", "DeFiLlama", "Cooler Subgraph"]} />
    </Card>
  );
}
