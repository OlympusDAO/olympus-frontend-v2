import React from "react";
import { formatUnits } from "viem";
import { useOhmPrice } from "@/lib/hooks/useOhmPrice";

/**
 * Calculate the discount percentage between the conversion price and current OHM price
 * @param conversionPrice - The conversion price in wei (18 decimals)
 * @returns discount percentage as a number (e.g., 2.2 for 2.2%)
 */
export function useDiscount(conversionPrice?: bigint) {
  const { price: ohmPrice, isLoading: isLoadingPrice } = useOhmPrice();

  const discount = React.useMemo(() => {
    if (!ohmPrice || !conversionPrice) return 0;

    // Convert both prices to numbers for calculation
    const ohmPriceFormatted = parseFloat(formatUnits(ohmPrice, 18));
    const conversionPriceFormatted = parseFloat(formatUnits(conversionPrice, 18));

    // Calculate discount: ((market_price - conversion_price) / market_price) * 100
    // If conversion price is lower than market price, there's a discount
    if (conversionPriceFormatted < ohmPriceFormatted) {
      return ((ohmPriceFormatted - conversionPriceFormatted) / ohmPriceFormatted) * 100;
    }

    return 0; // No discount if conversion price >= market price
  }, [ohmPrice, conversionPrice]);

  return {
    discount: discount,
    formattedDiscount: discount > 0 ? `${discount.toFixed(1)}%` : "0%",
    isLoading: isLoadingPrice,
  };
}
