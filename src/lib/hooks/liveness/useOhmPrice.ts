import { useMemo } from "react";
import { useTreasuryMetrics } from "@/lib/hooks/useTreasuryMetrics";
import { useOhmPriceHistory } from "./useOhmPriceHistory";

interface OhmPriceData {
  price: number;
  change24h: number;
}

export function useOhmPrice() {
  const { data: treasury, isLoading: tLoading } = useTreasuryMetrics();
  const { data: history } = useOhmPriceHistory();

  const data = useMemo<OhmPriceData | undefined>(() => {
    if (!treasury) return undefined;
    return {
      price: treasury.ohmPrice,
      change24h: history?.change24h ?? 0,
    };
  }, [treasury, history]);

  return { data, isLoading: tLoading };
}
