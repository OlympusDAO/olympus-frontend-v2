import { getAddress, type Address, type Hex } from "viem";
import { arbitrum, base, berachain, mainnet, optimism, robinhood } from "@/lib/chains";

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
