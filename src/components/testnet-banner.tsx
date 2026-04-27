import { AlertTriangle } from "lucide-react";

export function TestnetBanner() {
  const isTestnetMode = import.meta.env.VITE_TESTNET_MODE;

  if (!isTestnetMode) {
    return null;
  }

  return (
    <div className="bg-yellow/20  px-4 py-3">
      <div className="flex items-center justify-center gap-2 max-w-7xl mx-auto">
        <AlertTriangle className="h-5 w-5 text-yellow" />
        <p className="text-sm font-medium text-yellow">
          You are currently interacting with a testnet environment
        </p>
      </div>
    </div>
  );
}
