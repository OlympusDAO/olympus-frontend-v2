import { Link } from "react-router-dom";
import { calcOhmPremiumPct } from "@/modules/pulse/utils/ohm-metrics";
import { RiArrowRightSLine } from "@remixicon/react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TooltipInfo } from "@/components/ui/tooltip";
import { NumberFlow } from "@/components/ui/number-flow";
import { useCdStatistics } from "@/modules/pulse/hooks/useCdStatistics";
import { useCdReopenPrice } from "@/lib/hooks/cds/useCdReopenPrice";
import { mainnet } from "wagmi/chains";
import { useTreasuryMetrics } from "@/modules/pulse/hooks/useTreasuryMetrics.ts";
import { useOhmPrice } from "@/lib/hooks/liveness/useOhmPrice";
import { Separator } from "@/components/ui/separator.tsx";
import { PulseDot } from "@/components/pulse-dot.tsx";

export function OverviewConvertibleDeposits() {
  const { data: cd } = useCdStatistics();
  const { data: treasury } = useTreasuryMetrics();
  const { data: price } = useOhmPrice();

  const { reopenPrice } = useCdReopenPrice(mainnet.id);

  const totalDepositsUsd = cd?.totalDepositsUsd ?? 0;
  const activeBidsCount = cd?.activeBidsCount ?? 0;
  const isMarketActive = cd?.isMarketActive ?? false;

  const ohmPrice = price?.price ?? 0;
  const backing = treasury?.treasuryLiquidBackingPerOhmBacked ?? 0;
  const premiumPct = calcOhmPremiumPct(ohmPrice, backing);

  const statusLabel = isMarketActive ? "Active" : "Paused";
  const statusColor = isMarketActive ? "green" : "yellow";

  return (
    <Card className="p-5">
      {/* Header */}
      <div className=" flex items-center justify-between">
        <TooltipInfo title="Convertible Deposits allow users to deposit stablecoins and lock in an OHM conversion price.">
          <p className="text-sm/5 font-semibold text-primary-t">Convertible Deposits</p>
        </TooltipInfo>
        <div className="flex items-center gap-2">
          <span className="text-xs/4 text-secondary-t font-normal">{statusLabel}</span>
          <PulseDot variant={statusColor} />
        </div>
      </div>

      <Separator className="w-full my-4" />
      {/* Body */}
      <div>
        <p className="text-sm/5 text-secondary-t font-normal">Total Value Locked</p>
        <NumberFlow
          value={totalDepositsUsd}
          className="mt-1 block text-[32px]/[40px] font-semibold [--number-flow-char-height:1.25em]"
        />
        <div className="mt-0.5 flex items-center gap-x-0.5">
          <NumberFlow
            suffix="recent bids ·"
            format={{ style: "decimal" }}
            value={activeBidsCount}
            className="text-secondary-t text-xs/4 font-normal [--number-flow-char-height:1.3333em]"
          />
          <NumberFlow
            suffix="premium"
            prefix="+"
            format={{ style: "percent", maximumFractionDigits: 0 }}
            value={premiumPct / 100}
            className="text-secondary-t text-xs/4 font-normal [--number-flow-char-height:1.3333em]"
          />
        </div>
        {!isMarketActive && reopenPrice && (
          <p className="mt-0.5 text-xs/4 font-normal text-secondary-t">
            Market will reopen at{" "}
            <NumberFlow
              value={reopenPrice}
              format={{
                style: "currency",
                currency: "USD",
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }}
              className="text-xs/4 font-semibold text-primary-t [--number-flow-char-height:1.3333em]"
            />
          </p>
        )}
      </div>

      <div className="mt-4">
        <Button
          variant="secondary"
          size="md"
          className="w-full"
          render={<Link to="/cds/deposit" />}
        >
          Deposit
          <RiArrowRightSLine />
        </Button>
      </div>
    </Card>
  );
}
