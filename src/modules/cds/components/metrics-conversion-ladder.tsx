import type React from "react";
import {
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "@/components/ui/card.tsx";
import { Tooltip as InfoTooltip } from "@/components/ui/tooltip.tsx";
import { RiInformationFill } from "@remixicon/react";
import { useChainId } from "wagmi";
import { useConversionExposure } from "@/lib/hooks/cds/useStatisticsData.tsx";
import {
  buildConversionLadder,
  unlockMovePercent,
  type ConversionLadderBucket,
} from "@/lib/hooks/cds/conversion-ladder.ts";
import { summarizeMoneyness } from "@/lib/hooks/cds/conversion-exposure.ts";
import { useTokenPrice } from "@/lib/hooks/useTokenPrice.tsx";
import { getTokenAddress, TokenName } from "@/lib/tokens.ts";

const CHART_COLORS = {
  convertible: "var(--green)",
  pending: "var(--surface-a20)",
  grid: "var(--border-a10)",
  text: "var(--text-tertiary)",
  spot: "var(--text-tertiary)",
} as const;

const formatCurrency = (value: number) => {
  if (Math.abs(value) >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
  if (Math.abs(value) >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
};

const bucketLabel = (bucket: ConversionLadderBucket) =>
  bucket.isOverflow ? `$${bucket.priceFloor.toFixed(2)}+` : `$${bucket.priceFloor.toFixed(2)}`;

interface Row extends ConversionLadderBucket {
  label: string;
}

const LadderTooltip = ({
  active,
  payload,
  ohmPrice,
  bucketSize,
}: {
  active?: boolean;
  payload?: Array<{ payload: Row }>;
  ohmPrice: number;
  bucketSize: number;
}) => {
  if (!active || !payload || payload.length === 0) return null;

  const bucket = payload[0].payload;
  const range = bucket.isOverflow
    ? `$${bucket.priceFloor.toFixed(2)} and above`
    : `$${bucket.priceFloor.toFixed(2)} to $${bucket.priceCeiling.toFixed(2)}`;
  const movePercent = unlockMovePercent(bucket, ohmPrice, bucketSize);

  return (
    <div className="bg-surface-tooltip border border-a10-b rounded-2xl px-3 py-2 shadow-[0px_1px_4px_0px_var(--slate-a10)]">
      <p className="text-xs text-secondary-t mb-1.5">{range}</p>
      <p className="text-xs font-semibold text-primary-t">{formatCurrency(bucket.amountUsd)}</p>
      <p className="text-xs text-secondary-t mt-0.5">
        {bucket.positionCount} position{bucket.positionCount === 1 ? "" : "s"}
      </p>
      <p className="text-xs text-tertiary-t mt-0.5">
        {bucket.convertible
          ? "Convertible now"
          : movePercent > 0
            ? `Needs OHM +${movePercent.toFixed(1)}%`
            : "Partly convertible"}
      </p>
    </div>
  );
};

export const MetricsConversionLadder: React.FC = () => {
  const { data: exposure, isLoading, isError } = useConversionExposure();
  const chainId = useChainId();
  const { price: ohmPrice } = useTokenPrice(chainId, getTokenAddress(TokenName.OHM, chainId));
  const hasOhmPrice = ohmPrice > 0;

  const ladder = buildConversionLadder(exposure?.strikes ?? [], ohmPrice);
  const moneyness = summarizeMoneyness(exposure?.strikes ?? [], ohmPrice);
  const rows: Row[] = ladder.buckets.map((bucket) => ({ ...bucket, label: bucketLabel(bucket) }));

  // The bucket spot falls inside, so the marker can be drawn on a categorical axis.
  const spotRow = rows.find((row) => ohmPrice >= row.priceFloor && ohmPrice < row.priceCeiling);

  const body = (() => {
    if (isLoading) {
      return <div className="w-full h-60 bg-surface-a5 rounded-xl animate-pulse" />;
    }

    if (isError) {
      return (
        <div className="w-full h-60 flex flex-col items-center justify-center gap-1 text-center">
          <p className="text-sm text-secondary-t">Conversion data unavailable</p>
          <p className="text-xs text-tertiary-t max-w-xs">
            The convertible deposit indexer could not be reached.
          </p>
        </div>
      );
    }

    if (!hasOhmPrice) {
      return (
        <div className="w-full h-60 flex flex-col items-center justify-center gap-1 text-center">
          <p className="text-sm text-secondary-t">OHM price unavailable</p>
          <p className="text-xs text-tertiary-t max-w-xs">
            The ladder needs the live on-chain price to place the conversion threshold.
          </p>
        </div>
      );
    }

    if (rows.length === 0) {
      return (
        <div className="w-full h-60 flex items-center justify-center text-secondary-t text-sm">
          No outstanding convertible deposits
        </div>
      );
    }

    return (
      <ResponsiveContainer width="100%" height={240}>
        {/* Top margin leaves room for the spot marker's label, which sits above the plot. */}
        <BarChart data={rows} margin={{ top: 20, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
          <XAxis
            dataKey="label"
            stroke="transparent"
            tick={{ fill: CHART_COLORS.text, fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            interval={0}
          />
          <YAxis
            tickFormatter={formatCurrency}
            stroke="transparent"
            tick={{ fill: CHART_COLORS.text, fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            width={48}
          />
          <Tooltip
            content={<LadderTooltip ohmPrice={ohmPrice} bucketSize={ladder.bucketSize} />}
            cursor={{ fill: "var(--surface-a5)" }}
          />
          {spotRow && (
            <ReferenceLine
              x={spotRow.label}
              stroke={CHART_COLORS.spot}
              strokeDasharray="4 4"
              label={{
                value: `OHM $${ohmPrice.toFixed(2)}`,
                position: "top",
                fill: "var(--text-secondary)",
                fontSize: 11,
                offset: 8,
              }}
            />
          )}
          <Bar dataKey="amountUsd" radius={[4, 4, 0, 0]}>
            {rows.map((row) => (
              <Cell
                key={row.label}
                fill={row.convertible ? CHART_COLORS.convertible : CHART_COLORS.pending}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  })();

  return (
    <Card className="p-6 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5">
            <h3 className="text-xl font-semibold text-primary-t tracking-[0.2px]">
              Conversion Ladder
            </h3>
            <InfoTooltip title="Outstanding deposits grouped by the OHM price they convert at. Bars left of the marker can convert today; the rest need OHM to rise. Amounts are deposit value, not gain.">
              <RiInformationFill size={16} className="text-tertiary-t" />
            </InfoTooltip>
          </div>
          <p className="text-sm text-secondary-t mt-0.5">Deposits that convert at each OHM price</p>
        </div>
        {hasOhmPrice && !isLoading && !isError && (
          <div className="flex gap-6 shrink-0">
            <div className="text-right">
              <p className="text-xs text-secondary-t">Convertible now</p>
              <p className="text-lg font-semibold text-primary-t">
                {formatCurrency(ladder.convertibleUsd)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-secondary-t">Needs a higher price</p>
              <p className="text-lg font-semibold text-primary-t">
                {formatCurrency(ladder.pendingUsd)}
              </p>
            </div>
          </div>
        )}
      </div>

      {body}

      {hasOhmPrice && !isLoading && !isError && rows.length > 0 && (
        <div className="border-t border-a10-b pt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs">
          <span className="text-tertiary-t">
            <span className="text-secondary-t">In the money</span> {moneyness.inTheMoneyCount} of{" "}
            {moneyness.totalCount} positions
          </span>
          <span className="text-tertiary-t">
            <span className="text-secondary-t">Gain if converted now</span>{" "}
            {formatCurrency(moneyness.unrealizedGainUsd)}
          </span>
          <span className="text-tertiary-t">
            <span className="text-secondary-t">
              {moneyness.breakevenMovePercent > 0
                ? "OHM to break even"
                : "OHM above average strike"}
            </span>{" "}
            {moneyness.breakevenMovePercent > 0 ? "+" : ""}
            {Math.abs(moneyness.breakevenMovePercent).toFixed(1)}%
          </span>
          {ladder.nextUnlockUsd > 0 && (
            <span className="text-tertiary-t">
              <span className="text-secondary-t">Next tranche</span>{" "}
              {formatCurrency(ladder.nextUnlockUsd)} at +{ladder.nextUnlockMovePercent.toFixed(1)}%
            </span>
          )}
        </div>
      )}
    </Card>
  );
};
