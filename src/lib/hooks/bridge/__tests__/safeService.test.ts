import { afterEach, describe, expect, it, vi } from "vitest";
import { encodeFunctionData, erc20Abi, parseUnits, type Address, type Hex } from "viem";
import CCIPCrossChainBridgeAbi from "@/abis/CCIPCrossChainBridge";
import { arbitrum, mainnet } from "@/lib/chains";
import { ContractName, getContractAddress } from "@/lib/contracts";
import { CCIP_CHAIN_SELECTORS } from "@/modules/ohm/utils/constants";
import fixture from "./fixtures/safe-multisig-transactions.json";
import {
  fetchSafeExecutedTxs,
  fetchSafeNonce,
  fetchSafeQueuedBridgeTxs,
  getSafeQueueUrl,
  resolveSafeTransfer,
  toQueuedRow,
  type SafeMultisigTx,
} from "../safeService";

const SAFE = "0x245cc372C84B3645Bf0Ffe6538620B04a217988B" as Address;
const LOWER_SAFE = SAFE.toLowerCase() as Address;
const BRIDGE = getContractAddress(ContractName.CCIP_BRIDGE, mainnet.id) as Address;
const real = fixture.results[0] as unknown as SafeMultisigTx;
const sendData = encodeFunctionData({
  abi: CCIPCrossChainBridgeAbi,
  functionName: "sendToEVM",
  args: [CCIP_CHAIN_SELECTORS[arbitrum.id], SAFE, parseUnits("2.5", 9)],
});

const queued = (overrides: Partial<SafeMultisigTx>): SafeMultisigTx => ({
  ...real,
  isExecuted: false,
  isSuccessful: null,
  transactionHash: null,
  confirmationsRequired: 3,
  confirmations: [{}],
  safe: SAFE,
  safeTxHash: `0x${"a".repeat(64)}`,
  ...overrides,
});

function respondWith(...responses: unknown[]) {
  const fetchMock = vi.fn();
  for (const body of responses) {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => body });
  }
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => vi.unstubAllGlobals());

describe("real response shape", () => {
  it("has the fields the code reads", () => {
    expect(real.safeTxHash).toMatch(/^0x/);
    expect(real.transactionHash).toMatch(/^0x/);
    expect(real.isExecuted).toBe(true);
    expect(typeof real.confirmationsRequired).toBe("number");
    expect(typeof real.nonce).toBe("string");
  });
});

describe("toQueuedRow", () => {
  it("reads a direct send to the bridge", () => {
    expect(toQueuedRow(queued({ to: BRIDGE, data: sendData }), mainnet.id)).toMatchObject({
      source: "ccip",
      status: "AWAITING_SIGNATURES",
      srcChainId: mainnet.id,
      dstChainId: arbitrum.id,
      amount: "2.5",
      safeTxHash: `0x${"a".repeat(64)}`,
      safeProgress: { confirmations: 1, required: 3 },
    });
  });

  it("reads a send inside a MultiSend batch", () => {
    const approve = encodeFunctionData({
      abi: erc20Abi,
      functionName: "approve",
      args: [BRIDGE, 1n],
    });
    const row = toQueuedRow(
      queued({
        to: "0x9641d764fc13c8B624c04430C7356C1C7C8102e2",
        data: "0x",
        dataDecoded: {
          method: "multiSend",
          parameters: [
            {
              name: "transactions",
              valueDecoded: [
                { to: "0x64aa3364F17a4D01c6f1751Fd97C2BD3D7e7f1D5", data: approve },
                { to: BRIDGE, data: sendData as Hex },
              ],
            },
          ],
        },
      }),
      mainnet.id,
    );
    expect(row).toMatchObject({ dstChainId: arbitrum.id, amount: "2.5" });
  });

  it("ignores a Safe transaction that isn't a bridge send", () => {
    expect(toQueuedRow(real, mainnet.id)).toBeUndefined();
  });

  it("ignores a bridge call to some other function", () => {
    const retry = encodeFunctionData({
      abi: CCIPCrossChainBridgeAbi,
      functionName: "retryFailedMessage",
      args: [`0x${"b".repeat(64)}`],
    });
    expect(toQueuedRow(queued({ to: BRIDGE, data: retry }), mainnet.id)).toBeUndefined();
  });
});

describe("resolveSafeTransfer", () => {
  it("is awaiting while unexecuted with its nonce still ahead", () => {
    expect(resolveSafeTransfer(queued({ nonce: "5" }), 5)).toEqual({ state: "awaiting" });
  });

  it("gives the on-chain hash once executed", () => {
    const hash = `0x${"c".repeat(64)}` as Hex;
    expect(
      resolveSafeTransfer(
        queued({ isExecuted: true, isSuccessful: true, transactionHash: hash }),
        9,
      ),
    ).toEqual({ state: "executed", hash });
  });

  it("reports a reverted execution", () => {
    const hash = `0x${"c".repeat(64)}` as Hex;
    expect(
      resolveSafeTransfer(
        queued({ isExecuted: true, isSuccessful: false, transactionHash: hash }),
        9,
      ),
    ).toEqual({ state: "reverted", hash });
  });

  it("reports a proposal replaced by another with the same nonce", () => {
    expect(resolveSafeTransfer(queued({ nonce: "5" }), 6)).toEqual({ state: "replaced" });
  });

  it("stays awaiting when the Safe's nonce is unknown", () => {
    expect(resolveSafeTransfer(queued({ nonce: "5" }), undefined)).toEqual({ state: "awaiting" });
  });
});

describe("fetchers", () => {
  it("checksums the Safe address, which the service requires", async () => {
    const fetchMock = respondWith({ results: [real] });
    await expect(fetchSafeExecutedTxs(mainnet.id, LOWER_SAFE)).resolves.toEqual([real]);
    expect(fetchMock.mock.calls[0][0]).toContain(`/eth/api/v2/safes/${SAFE}/`);
    expect(fetchMock.mock.calls[0][0]).toContain("executed=true");
  });

  it("reads the nonce, undefined for a Safe not on that chain", async () => {
    respondWith({ nonce: "7" });
    await expect(fetchSafeNonce(mainnet.id, SAFE)).resolves.toBe(7);

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404 }));
    await expect(fetchSafeNonce(arbitrum.id, SAFE)).resolves.toBeUndefined();
  });

  it("treats an empty list for a Safe not on that chain as nothing, not an error", async () => {
    respondWith({ results: [] });
    await expect(fetchSafeExecutedTxs(arbitrum.id, SAFE)).resolves.toEqual([]);
  });

  it("lists only queued bridge sends", async () => {
    respondWith(
      { nonce: "5" },
      { results: [real, queued({ to: BRIDGE, data: sendData, nonce: "5" })] },
    );
    const rows = await fetchSafeQueuedBridgeTxs(mainnet.id, SAFE);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ amount: "2.5" });
  });

  it("has nothing queued on a chain the Safe isn't on", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404 }));
    await expect(fetchSafeQueuedBridgeTxs(arbitrum.id, SAFE)).resolves.toEqual([]);
  });
});

describe("getSafeQueueUrl", () => {
  it("uses the chain's prefix", () => {
    expect(getSafeQueueUrl(arbitrum.id, SAFE)).toBe(
      `https://app.safe.global/transactions/queue?safe=arb1:${SAFE}`,
    );
  });
});
