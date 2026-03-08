import { Card } from "@/components/ui/card";
import { Icon } from "@/components/icon";
import { useOhmPrice } from "@/lib/hooks/useOhmPrice";
import { useGohmPrice } from "@/lib/hooks/useGohmPrice";
import { useGohmConversionRate } from "@/lib/hooks/useGohmConversion";
import { ArrowLeftRight } from "lucide-react";

export function WrapInfoCards() {
  const { formattedPrice: ohmPrice, isLoading: ohmLoading } = useOhmPrice();
  const { formattedPrice: gohmPrice, isLoading: gohmLoading } = useGohmPrice();
  const { conversionRate, isLoading: indexLoading } = useGohmConversionRate();

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card className="flex flex-row items-center p-4 gap-3 h-25">
        <Icon name="OHMColorTokenIcon" size={40} />
        <div className="flex-1 min-w-0">
          <span className="text-md text-secondary-t">OHM Price</span>
          <div className="text-2xl font-bold leading-none">
            {ohmLoading ? "Loading..." : `$${ohmPrice}`}
          </div>
        </div>
      </Card>

      <Card className="flex flex-row items-center p-4 gap-3 h-25">
        <Icon name="GOHMColorTokenIcon" size={40} />
        <div className="flex-1 min-w-0">
          <span className="text-md text-secondary-t">gOHM Price</span>
          <div className="text-2xl font-bold leading-none">
            {gohmLoading ? "Loading..." : `$${gohmPrice}`}
          </div>
        </div>
      </Card>

      <Card className="flex flex-row items-center p-4 gap-3 h-25">
        <div className="w-10 h-10 rounded-full bg-surface-a3 flex items-center justify-center">
          <ArrowLeftRight className="w-5 h-5 text-secondary-t" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-md text-secondary-t">Conversion Rate</span>
          <div className="text-2xl font-bold leading-none">
            {indexLoading ? (
              "Loading..."
            ) : conversionRate ? (
              <span>1 OHM = {conversionRate} gOHM</span>
            ) : (
              "--"
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
