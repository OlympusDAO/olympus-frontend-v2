import {
  BaseError,
  ContractFunctionRevertedError,
  ContractFunctionZeroDataError,
  type Hex,
} from "viem";

export type WalletKind = "eoa" | "safe" | "contract" | "unknown";

/** EIP-7702 delegation code. The EOA behind it still signs and controls its address everywhere. */
const DELEGATION_PREFIX = "0xef0100";

/**
 * Fails closed: until both reads have answered, a wallet is `unknown`, and the UI won't send. A Safe
 * read as an EOA would skip the recipient check and the fee buffer.
 */
export function classifyWallet({
  connectorId,
  code,
  codeKnown,
  threshold,
}: {
  connectorId?: string;
  code?: Hex;
  codeKnown: boolean;
  /** Whether `getThreshold` answered, really isn't there, or hasn't been read. */
  threshold: "found" | "absent" | "unknown";
}): WalletKind {
  if (connectorId === "safe") return "safe";
  if (!codeKnown) return "unknown";
  if (!code || code === "0x" || code.startsWith(DELEGATION_PREFIX)) return "eoa";
  if (threshold === "found") return "safe";
  return threshold === "absent" ? "contract" : "unknown";
}

/** True only when the contract itself says no. A transport failure says nothing about the wallet. */
export function isThresholdAbsent(error: unknown): boolean {
  if (!(error instanceof BaseError)) return false;
  return !!error.walk(
    (cause) =>
      cause instanceof ContractFunctionRevertedError ||
      cause instanceof ContractFunctionZeroDataError,
  );
}
