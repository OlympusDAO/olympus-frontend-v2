import { formatUnits, type Address, type Hex } from "viem";

const CCIP_API = "https://api.ccip.chain.link/v2/messages";
const OHM_DECIMALS = 9;
const PAGE_SIZE = 100;
const DEFAULT_MAX_PAGES = 5;

export type CcipMessage = {
  messageId: Hex;
  sender: string;
  origin: string;
  status: string;
  readyForManualExecution: boolean;
  sourceNetworkInfo: { chainId: string; chainSelector: string };
  destNetworkInfo: { chainId: string; chainSelector: string };
  sendTransactionHash: string;
  sendTimestamp: string;
  receiptTransactionHash: string | null;
  sourceTokenAmount?: { tokenAddress: string; tokenAmount: string } | null;
};

type MessagesPage = {
  data: CcipMessage[];
  pagination: { hasNextPage: boolean; cursor: string | null };
};

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`CCIP API error: ${response.status}`);
  return response.json();
}

/**
 * Lists messages sent through a bridge. The API has no wallet filter (`sender` is the bridge
 * contract), so callers narrow the result with `filterByOrigin`, and the cost grows with the
 * bridge's total volume.
 */
export async function fetchBridgeMessages(
  bridge: Address,
  selector: bigint,
  { maxPages = DEFAULT_MAX_PAGES }: { maxPages?: number } = {},
): Promise<CcipMessage[]> {
  const messages: CcipMessage[] = [];
  let cursor: string | null = null;

  for (let page = 0; page < maxPages; page++) {
    const params = new URLSearchParams({
      sender: bridge,
      sourceChainSelector: selector.toString(),
      limit: String(PAGE_SIZE),
    });
    if (cursor) params.set("cursor", cursor);

    const result: MessagesPage = await getJson(`${CCIP_API}?${params}`);
    messages.push(...result.data);
    cursor = result.pagination.hasNextPage ? result.pagination.cursor : null;
    if (!cursor) break;
  }

  return messages;
}

export function fetchMessage(messageId: Hex): Promise<CcipMessage> {
  return getJson(`${CCIP_API}/${messageId}`);
}

/** `origin` is the transaction signer, so this finds EOA sends but not sends from a Safe. */
export function filterByOrigin(messages: CcipMessage[], wallet: Address): CcipMessage[] {
  const target = wallet.toLowerCase();
  return messages.filter((message) => message.origin.toLowerCase() === target);
}

export function getCcipAmount(message: CcipMessage): string | undefined {
  const amount = message.sourceTokenAmount?.tokenAmount;
  return amount === undefined ? undefined : formatUnits(BigInt(amount), OHM_DECIMALS);
}
