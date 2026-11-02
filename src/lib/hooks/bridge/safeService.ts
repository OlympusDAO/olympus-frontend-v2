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
    parameters?: { name: string; valueDecoded?: { to: Address; data: Hex | null }[] | null }[];
  } | null;
};

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Safe service error: ${response.status}`);
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
  } catch {
    return undefined;
  }
}

export async function fetchSafeExecutedTxs(
  chainId: number,
  safe: Address,
): Promise<SafeMultisigTx[]> {
  const { results } = await getJson<{ results: SafeMultisigTx[] }>(
    safeUrl(chainId, safe, "v2/safes/{safe}/multisig-transactions/?executed=true&limit=100"),
  );
  return results;
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
function safeTxCalls(tx: SafeMultisigTx): { to: Address; data: Hex | null }[] {
  const batch = tx.dataDecoded?.parameters?.find((p) => p.name === "transactions")?.valueDecoded;
  return batch ?? [{ to: tx.to, data: tx.data }];
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
      const [selector, , amount] = args;
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
