import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { allChains } from "@/lib/chains";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ChainGuardProps {
  /**
   * Chain IDs on which the wrapped feature is available. Order matters — the
   * first ID is used as the default "Switch to ..." target.
   */
  supportedChains: readonly number[];
  /**
   * User-facing feature name, e.g. "Convertible Deposits". Used in the
   * unsupported-chain copy.
   */
  featureName: string;
  children: React.ReactNode;
}

const getChainName = (chainId: number): string => {
  const chain = allChains.find((c) => c.id === chainId);
  return chain?.name ?? `chain ${chainId}`;
};

const formatChainList = (chainIds: readonly number[]): string => {
  const names = chainIds.map(getChainName);
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} or ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, or ${names[names.length - 1]}`;
};

// Only mention chains the user can actually switch to. Without this, a feature
// that supports mainnet + sepolia would advertise sepolia in the message even
// when testnet mode is off and the wallet can't switch there.
const isSelectableChain = (chainId: number): boolean => allChains.some((c) => c.id === chainId);

/**
 * Page-level guard that renders a "switch network" prompt when the wallet is
 * connected to a chain on which the wrapped feature isn't deployed.
 *
 * Wrap route elements that depend on contracts only deployed on a subset of
 * chains. Avoids the alternative — broken silent-empty UI or render-time
 * throws from `requireContractAddress`.
 */
export function ChainGuard({ supportedChains, featureName, children }: ChainGuardProps) {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending } = useSwitchChain();

  // When disconnected, `useChainId` returns the configured default (or last
  // connected) chain — not anything the user can influence without connecting.
  // Let them browse; the page's own action buttons will prompt to connect.
  if (!isConnected) return <>{children}</>;

  if (supportedChains.includes(chainId)) return <>{children}</>;

  const selectable = supportedChains.filter(isSelectableChain);
  // Fall back to the full list if (somehow) none are wallet-selectable, so the
  // user at least sees the feature's real chain requirements.
  const displayChains = selectable.length > 0 ? selectable : supportedChains;
  const primaryChainId = displayChains[0];
  const primaryName = getChainName(primaryChainId);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <Card className="max-w-md w-full p-8 text-center space-y-6">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-primary-t">Wrong network</h2>
          <p className="text-sm text-secondary-t">
            {featureName} is only available on {formatChainList(displayChains)}. Switch your
            wallet's network to continue.
          </p>
        </div>
        <Button
          onClick={() => switchChain({ chainId: primaryChainId })}
          disabled={isPending}
          className="w-full"
        >
          {isPending ? "Switching…" : `Switch to ${primaryName}`}
        </Button>
      </Card>
    </div>
  );
}
