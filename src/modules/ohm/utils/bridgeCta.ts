import { parseUnits } from "viem";
import type { AmountStatus } from "@/lib/hooks/bridge/amountLimits";
import type { RouteState } from "@/lib/hooks/bridge/routeState";

const OHM_DECIMALS = 9;

export type BridgeCta = {
  label: string;
  disabled: boolean;
  action: "connect" | "switch" | "confirm" | "none";
};

export type BridgeCtaInput = {
  isConnected: boolean;
  walletChainId: number;
  source: { chainId: number; name: string; nativeCurrencySymbol: string };
  route: RouteState;
  amount: bigint;
  ohmBalance?: bigint;
  amountStatus: AmountStatus;
  nativeBalance?: bigint;
  nativeFee?: bigint;
  /** The fee quote reverted, which means the route can't send whatever the other reads say. */
  feeFailed?: boolean;
  hasSufficientAllowance: boolean;
};

const blocked = (label: string): BridgeCta => ({ label, disabled: true, action: "none" });

export function getBridgeCta(input: BridgeCtaInput): BridgeCta {
  const { source, route, amount, ohmBalance, amountStatus, nativeBalance, nativeFee } = input;

  if (!input.isConnected) return { label: "Connect Wallet", disabled: true, action: "connect" };
  if (route.status === "loading") return blocked("Checking Bridge…");
  if (route.status === "unavailable") return blocked("Bridge Unavailable");
  if (input.walletChainId !== source.chainId) {
    return { label: `Switch to ${source.name}`, disabled: false, action: "switch" };
  }
  if (amount <= 0n) return blocked("Enter Amount");
  if (input.feeFailed) return blocked("Bridge Unavailable");
  if (ohmBalance !== undefined && amount > ohmBalance) return blocked("Insufficient OHM Balance");
  if (amountStatus === "exceeds-route-limit") return blocked("Exceeds Route Limit");
  if (amountStatus === "exceeds-liquidity") return blocked("Exceeds Available Liquidity");
  if (amountStatus === "unverified") return blocked("Checking Bridge…");
  if (nativeFee !== undefined && nativeBalance !== undefined && nativeBalance < nativeFee) {
    return blocked(`Insufficient ${source.nativeCurrencySymbol} for Fees`);
  }
  if (nativeFee === undefined) return blocked("Estimating Fee…");
  if (!input.hasSufficientAllowance) {
    return { label: "Approve OHM for Bridging", disabled: false, action: "confirm" };
  }
  return { label: "Bridge OHM", disabled: false, action: "confirm" };
}

/**
 * What stops the send from going ahead in the confirm modal, which stays open while route state,
 * capacity and the wallet's network can all change.
 */
export function getConfirmBlock({
  walletChainId,
  source,
  route,
  amountStatus,
}: Pick<BridgeCtaInput, "walletChainId" | "source" | "route" | "amountStatus">):
  | BridgeCta
  | undefined {
  if (route.status === "loading") return blocked("Checking Bridge…");
  if (route.status === "unavailable") return blocked("Bridge Unavailable");
  if (walletChainId !== source.chainId) {
    return { label: `Switch to ${source.name}`, disabled: false, action: "switch" };
  }
  if (amountStatus === "exceeds-route-limit") return blocked("Exceeds Route Limit");
  if (amountStatus === "exceeds-liquidity") return blocked("Exceeds Available Liquidity");
  if (amountStatus === "unverified") return blocked("Checking Bridge…");
  return undefined;
}

export function parseOhmAmount(value: string): bigint {
  try {
    return value ? parseUnits(value, OHM_DECIMALS) : 0n;
  } catch {
    return 0n;
  }
}

/** parseUnits rounds past 9 decimals, so cut the input and keep the amount shown equal to the amount sent. */
export function clampOhmDecimals(value: string): string {
  const [whole, fraction] = value.split(".");
  return fraction === undefined ? value : `${whole}.${fraction.slice(0, OHM_DECIMALS)}`;
}
