import type { Hex } from "viem";

export type WalletKind = "eoa" | "safe" | "contract";

/** EIP-7702 delegation code. The EOA behind it still signs and controls its address everywhere. */
const DELEGATION_PREFIX = "0xef0100";

export function classifyWallet({
  connectorId,
  code,
  hasThreshold,
}: {
  connectorId?: string;
  code?: Hex;
  hasThreshold: boolean;
}): WalletKind {
  if (connectorId === "safe") return "safe";
  if (!code || code === "0x" || code.startsWith(DELEGATION_PREFIX)) return "eoa";
  return hasThreshold ? "safe" : "contract";
}
