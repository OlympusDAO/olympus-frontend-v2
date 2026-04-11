import { Slider } from "@/components/ui/slider";

interface LtvSliderProps {
  ltvPercentage: number;
  onLtvChange: (value: number) => void;
  isRepayMode: boolean;
}

export function BorrowLtvSlider({ ltvPercentage, onLtvChange, isRepayMode }: LtvSliderProps) {
  return (
    <div data-slot="ltv-slider" className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">
          {isRepayMode ? "Collateral to Withdraw" : "Loan to Collateral"}
        </p>
        <p className="text-sm font-semibold">{ltvPercentage.toFixed(0)}%</p>
      </div>
      <Slider
        value={[ltvPercentage]}
        onValueChange={([value]) => onLtvChange(value)}
        min={0}
        max={100}
        step={1}
      />
    </div>
  );
}
