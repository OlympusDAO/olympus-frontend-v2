import { decodeFunctionData, formatUnits, getAddress, type Address, type Hex } from "viem";
import CCIPCrossChainBridgeAbi from "@/abis/CCIPCrossChainBridge";
import { arbitrum, base, berachain, mainnet, optimism, robinhood } from "@/lib/chains";
import { ContractName, getContractAddress } from "@/lib/contracts";
import { CCIP_CHAIN_SELECTORS } from "@/modules/ohm/utils/constants";
import type { BridgeHistoryItem } from "./useBridgeHistory";

const SAFE_SERVICE = "https://api.safe.global/tx-service";

/** The Safe Transaction Service's path per chain, also Safe's chain prefix in its app URLs. */
export const SAFE_SERVICE_SLUGS: Record<number, string> = {
  [mainnet.id]: "eth",
  [arbitrum.id]: "arb1",
  [base.id]: "base",
  [optimism.id]: "oeth",
  [berachain.id]: "berachain",
  [robinhood.id]: "robinhood",
};

export type SafeMultisigTx = {
  safe: Address;
  to: Address;
  value: string;
  data: Hex | null;
  nonce: string;
  isExecuted: boolean;
  isSuccessful: boolean | null;
  transactionHash: Hex | null;
  safeTxHash: Hex;
  submissionDate: string;
  executionDate: string | null;
  confirmationsRequired: number;
  confirmations: unknown[] | null;
  dataDecoded?: {
    method: string;
    parameters?: {
      name: string;
      valueDecoded?: { to: Address; value?: string; data: Hex | null }[] | null;
    }[];
  } | null;
};

class SafeServiceError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`Safe service error: ${status}`);
    this.status = status;
  }
}

export function isNotFound(error: unknown): boolean {
  return error instanceof SafeServiceError && error.status === 404;
}

async function getJson<T>(url: string): Promise<T> {
  // The unauthenticated quota is small and shared (5000 requests over about 18 days when measured).
  const key = import.meta.env.VITE_OLYMPUS_SAFE_API_KEY;
  const response = await fetch(url, { headers: key ? { Authorization: `Bearer ${key}` } : {} });
  if (!response.ok) throw new SafeServiceError(response.status);
  return response.json();
}

export function getSafeQueueUrl(chainId: number, safe: string): string {
  return `https://app.safe.global/transactions/queue?safe=${SAFE_SERVICE_SLUGS[chainId]}:${safe}`;
}

export function fetchSafeTx(chainId: number, safeTxHash: Hex): Promise<SafeMultisigTx> {
  return getJson(
    `${SAFE_SERVICE}/${SAFE_SERVICE_SLUGS[chainId]}/api/v2/multisig-transactions/${safeTxHash}/`,
  );
}

function safeUrl(chainId: number, safe: Address, path: string): string {
  return `${SAFE_SERVICE}/${SAFE_SERVICE_SLUGS[chainId]}/api/${path.replace("{safe}", getAddress(safe))}`;
}

/** The Safe's next nonce, undefined if it isn't deployed on that chain. */
export async function fetchSafeNonce(chainId: number, safe: Address): Promise<number | undefined> {
  try {
    const { nonce } = await getJson<{ nonce: string }>(safeUrl(chainId, safe, "v1/safes/{safe}/"));
    return Number(nonce);
  } catch (error) {
    if (isNotFound(error)) return undefined;
    throw error;
  }
}

/** The CCIP bridge didn't carry EVM traffic before this, so older Safe transactions can't match. */
const BRIDGE_LAUNCH = "2026-10-20T00:00:00Z";
const MAX_EXECUTED_PAGES = 5;

export async function fetchSafeExecutedTxs(
  chainId: number,
  safe: Address,
): Promise<SafeMultisigTx[]> {
  const transactions: SafeMultisigTx[] = [];
  let url: string | null | undefined = safeUrl(
    chainId,
    safe,
    `v2/safes/{safe}/multisig-transactions/?executed=true&execution_date__gte=${BRIDGE_LAUNCH}&limit=100`,
  );
  for (let page = 0; url && page < MAX_EXECUTED_PAGES; page++) {
    const result: { results: SafeMultisigTx[]; next?: string | null } = await getJson(url);
    transactions.push(...result.results);
    url = result.next;
  }
  return transactions;
}

export async function fetchSafeQueuedBridgeTxs(
  chainId: number,
  safe: Address,
): Promise<BridgeHistoryItem[]> {
  const nonce = await fetchSafeNonce(chainId, safe);
  if (nonce === undefined) return [];
  const { results } = await getJson<{ results: SafeMultisigTx[] }>(
    safeUrl(
      chainId,
      safe,
      `v2/safes/{safe}/multisig-transactions/?executed=false&nonce__gte=${nonce}&limit=50`,
    ),
  );
  return results.flatMap((tx) => toQueuedRow(tx, chainId) ?? []);
}

/** A Safe transaction's calls: the batch's if it's a MultiSend, otherwise its own. */
function safeTxCalls(tx: SafeMultisigTx): { to: Address; value?: string; data: Hex | null }[] {
  const batch = tx.dataDecoded?.parameters?.find((p) => p.name === "transactions")?.valueDecoded;
  return batch ?? [{ to: tx.to, value: tx.value, data: tx.data }];
}

/** Reads a queued Safe transaction as a pending bridge row, if it contains a bridge send. */
export function toQueuedRow(tx: SafeMultisigTx, chainId: number): BridgeHistoryItem | undefined {
  const bridge = getContractAddress(ContractName.CCIP_BRIDGE, chainId)?.toLowerCase();
  for (const call of safeTxCalls(tx)) {
    if (call.to.toLowerCase() !== bridge || !call.data) continue;
    try {
      const { functionName, args } = decodeFunctionData({
        abi: CCIPCrossChainBridgeAbi,
        data: call.data,
      });
      if (functionName !== "sendToEVM") continue;
      const [selector, recipient, amount] = args;
      const destination = Object.entries(CCIP_CHAIN_SELECTORS).find(([, s]) => s === selector);
      if (!destination) continue;
      return {
        source: "ccip",
        srcChainId: chainId,
        dstChainId: Number(destination[0]),
        timestamp: tx.submissionDate,
        amount: formatUnits(amount, 9),
        srcTxHash: "",
        status: "AWAITING_SIGNATURES",
        safeTxHash: tx.safeTxHash,
        safeSend: { value: call.value ?? "0", selector, recipient, amount },
        safeProgress: {
          confirmations: tx.confirmations?.length ?? 0,
          required: tx.confirmationsRequired,
          queueUrl: getSafeQueueUrl(chainId, tx.safe),
        },
      };
    } catch {}
  }
  return undefined;
}

export type SafeTransferResolution =
  | { state: "awaiting" }
  | { state: "executed"; hash: Hex }
  | { state: "reverted"; hash: Hex }
  | { state: "replaced" };

/** What happened to a proposal. Another transaction using its nonce means it can never execute. */
export function resolveSafeTransfer(
  tx: SafeMultisigTx,
  safeNonce: number | undefined,
): SafeTransferResolution {
  if (tx.isExecuted && tx.transactionHash) {
    return { state: tx.isSuccessful ? "executed" : "reverted", hash: tx.transactionHash };
  }
  if (safeNonce !== undefined && Number(tx.nonce) < safeNonce) return { state: "replaced" };
  return { state: "awaiting" };
}

/** The fee rose past what a queued proposal pays, so executing it would fail. */
export function isFeeShort(value: string, fee: bigint): boolean {
  return BigInt(value) < fee;
}

const MISSING_GRACE = 86_400_000;

/**
 * For a proposal the service has no record of. A wallet that executes a send on the spot returns its
 * on-chain hash rather than a Safe hash; otherwise the proposal was deleted, or isn't indexed yet.
 */
export function resolveMissingProposal(
  hasReceipt: boolean,
  ageMs: number,
): "promote" | "wait" | "drop" {
  if (hasReceipt) return "promote";
  return ageMs > MISSING_GRACE ? "drop" : "wait";
}
