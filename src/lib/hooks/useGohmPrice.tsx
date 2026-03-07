import { useOhmPrice } from "@/lib/hooks/useOhmPrice";
import { useCurrentIndex } from "@/lib/hooks/useCurrentIndex";
import { formatUnits } from "viem";
import { useMockData } from "@/lib/mock/provider";

export function useGohmPrice() {
  const mock = useMockData();
  const { price: ohmPriceBigInt, isLoading: ohmLoading } = useOhmPrice();
  const { formattedIndex, isLoading: indexLoading } = useCurrentIndex();

  if (mock) {
    const price = mock.scenario.prices.gohmPrice;
    return {
      price,
      formattedPrice: price.toFixed(2),
      isLoading: false,
    };
  }

  const ohmPrice = ohmPriceBigInt != null ? parseFloat(formatUnits(ohmPriceBigInt, 18)) : 0;
  const gohmPrice = formattedIndex ? ohmPrice * formattedIndex : 0;

  return {
    price: gohmPrice,
    formattedPrice: gohmPrice > 0 ? gohmPrice.toFixed(2) : "0.00",
    isLoading: ohmLoading || indexLoading,
  };
}
