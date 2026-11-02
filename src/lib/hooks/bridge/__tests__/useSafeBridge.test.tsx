import { act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHookWithProviders } from "@/test/test-utils";
import { arbitrum, mainnet } from "@/lib/chains";
import { ContractName, getContractAddress } from "@/lib/contracts";
import { readTrackedTransfers } from "../trackedTransfers";
import { useSafeBridge } from "../useSafeBridge";

const SAFE = "0x00000000000000000000000000000000000000c1";
const RECIPIENT = "0x00000000000000000000000000000000000000d1";
const SAFE_TX = `0x${"a".repeat(64)}`;
const APPROVE_TX = `0x${"b".repeat(64)}`;

const mocks = vi.hoisted(() => ({
  account: { address: "0x00000000000000000000000000000000000000c1" },
  capabilities: undefined as unknown,
  capabilityArgs: vi.fn(),
  readContract: vi.fn(),
  writeContractAsync: vi.fn(),
  sendCallsAsync: vi.fn(),
}));

vi.mock("wagmi", () => ({
  useAccount: () => ({ address: mocks.account.address }),
  useConfig: () => ({}),
  useSendCalls: () => ({ sendCallsAsync: mocks.sendCallsAsync }),
  useWriteContract: () => ({ writeContractAsync: mocks.writeContractAsync }),
}));
vi.mock("wagmi/actions", () => ({
  getPublicClient: () => ({ readContract: mocks.readContract }),
  getCapabilities: async (_config: unknown, args: unknown) => {
    mocks.capabilityArgs(args);
    if (mocks.capabilities === "throws") throw new Error("unsupported");
    return mocks.capabilities;
  },
}));

const args = {
  sourceChainId: mainnet.id,
  destinationChainId: arbitrum.id,
  recipientAddress: RECIPIENT,
  amount: "1",
  needsApproval: true,
} as const;

describe("useSafeBridge", () => {
  beforeEach(() => {
    localStorage.clear();
    mocks.account.address = SAFE;
    mocks.capabilities = undefined;
    mocks.readContract.mockReset().mockResolvedValue(100n);
    mocks.writeContractAsync.mockReset();
    mocks.sendCallsAsync.mockReset();
  });

  it("batches approve and send when the wallet supports it, paying the buffered fee", async () => {
    mocks.capabilities = { atomic: { status: "supported" } };
    mocks.sendCallsAsync.mockResolvedValue({ id: SAFE_TX });
    const { result, rerender } = renderHookWithProviders(() => useSafeBridge());

    await act(() => result.current.propose(args));
    rerender();

    const call = mocks.sendCallsAsync.mock.calls[0][0];
    const bridge = getContractAddress(ContractName.CCIP_BRIDGE, mainnet.id);
    expect(call.calls).toHaveLength(2);
    expect(call.calls[0].functionName).toBe("approve");
    expect(call.calls[0].args).toEqual([bridge, 1_000_000_000n]);
    expect(call.calls[1]).toMatchObject({ to: bridge, functionName: "sendToEVM", value: 125n });
    expect(mocks.writeContractAsync).not.toHaveBeenCalled();
    expect(result.current.safeTxHash).toBe(SAFE_TX);
  });

  it("accepts the older atomicBatch capability shape", async () => {
    mocks.capabilities = { atomicBatch: { supported: true } };
    mocks.sendCallsAsync.mockResolvedValue({ id: SAFE_TX });
    const { result } = renderHookWithProviders(() => useSafeBridge());
    await act(() => result.current.propose(args));
    expect(mocks.sendCallsAsync).toHaveBeenCalled();
  });

  it("queues approve then send when batching isn't supported", async () => {
    mocks.writeContractAsync.mockResolvedValueOnce(APPROVE_TX).mockResolvedValueOnce(SAFE_TX);
    const { result, rerender } = renderHookWithProviders(() => useSafeBridge());

    await act(() => result.current.propose(args));
    rerender();

    const [first, second] = mocks.writeContractAsync.mock.calls.map((c) => c[0]);
    expect(first.functionName).toBe("approve");
    expect(second).toMatchObject({ functionName: "sendToEVM", value: 125n, account: SAFE });
    expect(result.current.safeTxHash).toBe(SAFE_TX);
  });

  it("asks about capabilities on the source chain, at proposal time", async () => {
    mocks.capabilities = { atomic: { status: "supported" } };
    mocks.sendCallsAsync.mockResolvedValue({ id: SAFE_TX });
    const { result } = renderHookWithProviders(() => useSafeBridge());
    await act(() => result.current.propose(args));
    expect(mocks.capabilityArgs).toHaveBeenCalledWith(
      expect.objectContaining({ account: SAFE, chainId: mainnet.id }),
    );
  });

  it("falls back to queueing when the wallet can't report capabilities", async () => {
    mocks.capabilities = "throws";
    mocks.writeContractAsync.mockResolvedValueOnce(APPROVE_TX).mockResolvedValueOnce(SAFE_TX);
    const { result } = renderHookWithProviders(() => useSafeBridge());
    await act(() => result.current.propose(args));
    expect(mocks.sendCallsAsync).not.toHaveBeenCalled();
    expect(mocks.writeContractAsync).toHaveBeenCalledTimes(2);
  });

  it("sends alone when already approved", async () => {
    mocks.capabilities = { atomic: { status: "supported" } };
    mocks.writeContractAsync.mockResolvedValue(SAFE_TX);
    const { result } = renderHookWithProviders(() => useSafeBridge());

    await act(() => result.current.propose({ ...args, needsApproval: false }));

    expect(mocks.sendCallsAsync).not.toHaveBeenCalled();
    expect(mocks.writeContractAsync).toHaveBeenCalledTimes(1);
  });

  it("tracks the proposal by its Safe hash for this wallet", async () => {
    mocks.capabilities = { atomic: { status: "supported" } };
    mocks.sendCallsAsync.mockResolvedValue({ id: SAFE_TX });
    const { result } = renderHookWithProviders(() => useSafeBridge());

    await act(() => result.current.propose(args));

    expect(readTrackedTransfers(SAFE)).toMatchObject([
      { safeTxHash: SAFE_TX, srcChainId: mainnet.id, dstChainId: arbitrum.id, amount: "1" },
    ]);
  });

  it("reports a failure rather than tracking anything", async () => {
    mocks.writeContractAsync.mockRejectedValue(new Error("rejected"));
    const { result, rerender } = renderHookWithProviders(() => useSafeBridge());

    await act(() => result.current.propose(args));
    rerender();

    expect(result.current.error?.message).toBe("rejected");
    expect(readTrackedTransfers(SAFE)).toEqual([]);
  });

  it("doesn't propose if the account changed while the fee was being read", async () => {
    let resolveFee: (fee: bigint) => void = () => {};
    mocks.readContract.mockReturnValue(new Promise((resolve) => (resolveFee = resolve)));
    const { result, rerender } = renderHookWithProviders(() => useSafeBridge());

    let pending: Promise<void> = Promise.resolve();
    act(() => {
      pending = result.current.propose(args);
    });
    mocks.account.address = "0x00000000000000000000000000000000000000c2";
    rerender();
    await act(async () => {
      resolveFee(100n);
      await pending;
    });

    expect(mocks.writeContractAsync).not.toHaveBeenCalled();
  });
});
