import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { WrapInfoCards } from "../components/wrap-info-cards";
import { WrapForm } from "../components/wrap-form";
import { WrapBalancePanel } from "../components/wrap-balance-panel.tsx";
import { WrapOhmModal } from "@/components/wrap-ohm-modal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { useGohmConversion } from "@/lib/hooks/useGohmConversion";
import { Card } from "@/components/ui/card";

export function WrapPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialMode = searchParams.get("mode") === "unwrap" ? "unwrap" : "wrap";
  const [mode, setMode] = useState<"wrap" | "unwrap">(initialMode);
  const [inputAmount, setInputAmount] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Read conversion directly from gOHM contract to match actual output
  const { outputAmount } = useGohmConversion(mode, inputAmount);

  const handleModeChange = (newMode: "wrap" | "unwrap") => {
    setMode(newMode);
    setInputAmount("");
    setSearchParams(newMode === "unwrap" ? { mode: "unwrap" } : {}, { replace: true });
  };

  const handleSubmit = () => {
    if (inputAmount && parseFloat(inputAmount) > 0) {
      setIsModalOpen(true);
    }
  };

  return (
    <div className="mx-auto max-w-7xl">
      <WrapInfoCards />

      <Tabs onValueChange={handleModeChange} defaultValue="wrap" variant="primary" className="mt-8">
        <TabsList variant="primary">
          <TabsTrigger value="wrap" variant="primary">
            Wrap
          </TabsTrigger>
          <TabsTrigger value="unwrap" variant="primary">
            Unwrap
          </TabsTrigger>
        </TabsList>

        <TabsContent value="wrap" className="">
          <Card className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <WrapForm
                mode={mode}
                inputAmount={inputAmount}
                onInputAmountChange={setInputAmount}
                outputAmount={outputAmount}
                onSubmit={handleSubmit}
              />
              <WrapBalancePanel mode={mode} inputAmount={inputAmount} outputAmount={outputAmount} />
            </div>
          </Card>
        </TabsContent>
        <TabsContent value="unwrap" className="">
          <Card className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <WrapForm
                mode={mode}
                inputAmount={inputAmount}
                onInputAmountChange={setInputAmount}
                outputAmount={outputAmount}
                onSubmit={handleSubmit}
              />
              <WrapBalancePanel mode={mode} inputAmount={inputAmount} outputAmount={outputAmount} />
            </div>
          </Card>
        </TabsContent>
      </Tabs>

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
