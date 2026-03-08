import { useState } from "react";
import { WrapInfoCards } from "../components/wrap-info-cards";
import { WrapForm } from "../components/wrap-form";
import { BalancePanel } from "../components/balance-panel";
import { WrapOhmModal } from "@/components/wrap-ohm-modal";
import { useGohmConversion } from "@/lib/hooks/useGohmConversion";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function WrapPage() {
  const [mode, setMode] = useState<"wrap" | "unwrap">("wrap");
  const [inputAmount, setInputAmount] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Read conversion directly from gOHM contract to match actual output
  const { outputAmount } = useGohmConversion(mode, inputAmount);

  const handleModeChange = (newMode: "wrap" | "unwrap") => {
    setMode(newMode);
    setInputAmount("");
  };

  const handleSubmit = () => {
    if (inputAmount && parseFloat(inputAmount) > 0) {
      setIsModalOpen(true);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <WrapInfoCards />

      <div className="flex gap-4">
        <button
          type="button"
          onClick={() => handleModeChange("wrap")}
          className={cn(
            "text-xl font-semibold transition-colors",
            mode === "wrap" ? "text-primary-t" : "text-secondary-t hover:text-primary-t",
          )}
        >
          Wrap
        </button>
        <button
          type="button"
          onClick={() => handleModeChange("unwrap")}
          className={cn(
            "text-xl font-semibold transition-colors",
            mode === "unwrap" ? "text-primary-t" : "text-secondary-t hover:text-primary-t",
          )}
        >
          Unwrap
        </button>
      </div>

      <Card className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <WrapForm
            mode={mode}
            inputAmount={inputAmount}
            onInputAmountChange={setInputAmount}
            outputAmount={outputAmount}
            onSubmit={handleSubmit}
          />
          <BalancePanel mode={mode} inputAmount={inputAmount} outputAmount={outputAmount} />
        </div>
      </Card>

      {isModalOpen && (
        <WrapOhmModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setInputAmount("");
          }}
          mode={mode}
          inputAmount={inputAmount}
          outputAmount={outputAmount}
        />
      )}
    </div>
  );
}
