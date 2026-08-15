import { useState } from "react";
import { useSearchParams } from "react-router";
import { WrapInfoCards } from "../components/wrap-info-cards";
import { WrapForm } from "../components/wrap-form";
import { WrapBalancePanel } from "../components/wrap-balance-panel.tsx";
import { WrapOhmModal } from "@/components/wrap-ohm-modal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { useGohmConversion } from "@/lib/hooks/useGohmConversion";
import { Card } from "@/components/ui/card";
import { TOKENS, type TokenName } from "@/lib/tokens";
import {
  WRAP_FLOWS,
  defaultSourceToken,
  getWrapFlow,
  parseSourceTokenParam,
  type WrapMode,
} from "../components/wrap-flows";

export function WrapPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialMode: WrapMode = searchParams.get("mode") === "unwrap" ? "unwrap" : "wrap";
  const [mode, setMode] = useState<WrapMode>(initialMode);
  // ?token=<symbol> (e.g. the Balances page sOHM row links ?token=sOHM) preselects the source.
  const [sourceToken, setSourceToken] = useState<TokenName>(
    () =>
      parseSourceTokenParam(initialMode, searchParams.get("token")) ??
      defaultSourceToken(initialMode),
  );
  const [inputAmount, setInputAmount] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const flow = getWrapFlow(mode, sourceToken);

  // Read conversion directly from gOHM contract to match actual output
  const { outputAmount } = useGohmConversion(WRAP_FLOWS[flow].conversion, inputAmount);

  const syncUrl = (nextMode: WrapMode, nextSource: TokenName) => {
    const params: Record<string, string> = {};
    if (nextMode === "unwrap") params.mode = "unwrap";
    if (nextSource !== defaultSourceToken(nextMode)) params.token = TOKENS[nextSource].symbol;
    setSearchParams(params, { replace: true });
  };

  const handleModeChange = (newMode: WrapMode) => {
    // Keep sOHM selected across tabs (it's a valid source on both); otherwise reset.
    const nextSource =
      parseSourceTokenParam(newMode, TOKENS[sourceToken].symbol) ?? defaultSourceToken(newMode);
    setMode(newMode);
    setSourceToken(nextSource);
    setInputAmount("");
    syncUrl(newMode, nextSource);
  };

  const handleSourceTokenChange = (token: TokenName) => {
    setSourceToken(token);
    setInputAmount("");
    syncUrl(mode, token);
  };

  const handleSubmit = () => {
    if (inputAmount && parseFloat(inputAmount) > 0) {
      setIsModalOpen(true);
    }
  };

  const panel = (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <WrapForm
        mode={mode}
        sourceToken={sourceToken}
        onSourceTokenChange={handleSourceTokenChange}
        inputAmount={inputAmount}
        onInputAmountChange={setInputAmount}
        outputAmount={outputAmount}
        onSubmit={handleSubmit}
      />
      <WrapBalancePanel flow={flow} inputAmount={inputAmount} outputAmount={outputAmount} />
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl">
      <WrapInfoCards />

      <Tabs
        onValueChange={(v) => handleModeChange(v as WrapMode)}
        value={mode}
        variant="primary"
        className="mt-8"
      >
        <TabsList variant="primary">
          <TabsTrigger value="wrap" variant="primary">
            Wrap
          </TabsTrigger>
          <TabsTrigger value="unwrap" variant="primary">
            Unwrap
          </TabsTrigger>
        </TabsList>

        <TabsContent value="wrap" className="">
          <Card className="p-6">{panel}</Card>
        </TabsContent>
        <TabsContent value="unwrap" className="">
          <Card className="p-6">{panel}</Card>
        </TabsContent>
      </Tabs>

      {isModalOpen && (
        <WrapOhmModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setInputAmount("");
          }}
          flow={flow}
          inputAmount={inputAmount}
          outputAmount={outputAmount}
        />
      )}
    </div>
  );
}
