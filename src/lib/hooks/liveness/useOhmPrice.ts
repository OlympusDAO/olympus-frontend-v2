import { useMemo } from "react";
import { useTreasuryMetrics } from "@/modules/pulse/hooks/useTreasuryMetrics.ts";

interface OhmPriceData {
  price: number;
}

export function useOhmPrice() {
  const { data: treasury, isLoading } = useTreasuryMetrics();

  const data = useMemo<OhmPriceData | undefined>(() => {
    if (!treasury) return undefined;
    return { price: treasury.ohmPrice };
  }, [treasury]);

  return { data, isLoading };
}
