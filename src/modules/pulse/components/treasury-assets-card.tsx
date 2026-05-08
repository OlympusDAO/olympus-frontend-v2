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
      color: "rgba(137, 121, 255, 1)",
      apy: coolerApy,
    },
    { name: "sUSDe", value: susdeValue, color: "rgba(255, 146, 138, 1)", apy: susdeApy },
    { name: "LP positions", value: lpTotal, color: "rgba(60, 195, 223, 1)", apy: lpApy },
    { name: "sUSDS", value: susdsValue, color: "rgba(255, 174, 76, 1)", apy: susdsApy },
  ].filter((s) => s.value > 0);
}

function DonutTooltip({
  active,
  payload,
  total,
}: {
  active?: boolean;
  payload?: { name: string; value: number; payload: { name: string } }[];
  total: number;
}) {
  if (!active || !payload?.[0]) return null;
  const entry = payload[0];
  const pct = total > 0 ? (entry.value / total) * 100 : 0;

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

  return (
    <Card className="flex h-full flex-col gap-4 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-[18px]/[20px] font-semibold">Assets</h3>
          <p className="mt-1 text-xs text-secondary-t">
            Major income-producing treasury positions. LP APY is the weighted fee APY across
            protocol owned liquidity.
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

      <div className="flex flex-1 items-center gap-4">
        <div className="shrink-0">
          <PieChart width={120} height={120}>
            <Pie
              data={slices}
              dataKey="value"
              nameKey="name"
              innerRadius={36}
              outerRadius={56}
              paddingAngle={1}
              stroke="var(--surface-bg-l2)"
              strokeWidth={2}
            >
              {slices.map((s) => (
                <Cell key={s.name} fill={s.color} />
              ))}
            </Pie>
            <Tooltip content={<DonutTooltip total={treasuryMarketValue} />} />
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
      <div className="flex items-center justify-between gap-4">
        <TooltipInfo title="Treasury Market Value less outstanding Cooler loan receivables">
          <p className="text-primary-t text-sm font-semibold">Free Reserves</p>
        </TooltipInfo>
        <NumberFlow
          value={freeReserves}
          className="shrink-0 text-sm font-semibold [--number-flow-char-height:20px]"
        />
      </div>

      <ProtocolDataSource
        sources={["Treasury API", "DeFiLlama", "Cooler Subgraph"]}
        className="pt-0"
      />
    </Card>
  );
}
