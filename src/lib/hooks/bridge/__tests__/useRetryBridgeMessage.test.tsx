import { act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHookWithProviders } from "@/test/test-utils";
import { ContractName, getContractAddress } from "@/lib/contracts";
import { useRetryBridgeMessage } from "../useRetryBridgeMessage";
import type { BridgeHistoryItem } from "../useBridgeHistory";

const writeContract = vi.fn();
const switchChainAsync = vi.fn();
const state = vi.hoisted(() => ({ chainId: 42161, writeError: null as Error | null }));
const toast = vi.hoisted(() => vi.fn(() => ({ reset: vi.fn() })));
const waitArgs = vi.hoisted(() => vi.fn());

vi.mock("wagmi", () => ({
  useChainId: () => state.chainId,
  useSwitchChain: () => ({ switchChainAsync }),
  useWriteContract: () => ({
    data: undefined,
    writeContract,
    isPending: false,
    error: state.writeError,
    reset: vi.fn(),
  }),
  useWaitForTransactionReceipt: (args: unknown) => {
    waitArgs(args);
    return { isLoading: false, isSuccess: false, error: null };
  },
}));

vi.mock("../../useTransactionToast", () => ({ useTransactionToast: toast }));

const MESSAGE_ID = `0x${"ab".repeat(32)}` as const;
const item: BridgeHistoryItem = {
  source: "ccip",
  srcChainId: 1,
  dstChainId: 42161,
  timestamp: "2026-11-01T10:00:00.000Z",
  amount: "1",
  srcTxHash: "0xsend",
  status: "NEEDS_RETRY",
  messageId: MESSAGE_ID,
};

describe("useRetryBridgeMessage", () => {
  beforeEach(() => {
    writeContract.mockReset();
    switchChainAsync.mockReset();
    state.chainId = 42161;
    state.writeError = null;
  });

  it("calls retryFailedMessage on the destination chain's bridge", async () => {
    const { result } = renderHookWithProviders(() => useRetryBridgeMessage());
    await act(() => result.current.retry(item));

    expect(switchChainAsync).not.toHaveBeenCalled();
    expect(writeContract).toHaveBeenCalledWith(
      expect.objectContaining({
        address: getContractAddress(ContractName.CCIP_BRIDGE, 42161),
        functionName: "retryFailedMessage",
        args: [MESSAGE_ID],
        chainId: 42161,
      }),
    );
  });

  it("switches to the destination chain first", async () => {
    state.chainId = 1;
    const { result } = renderHookWithProviders(() => useRetryBridgeMessage());
    await act(() => result.current.retry(item));

    expect(switchChainAsync).toHaveBeenCalledWith({ chainId: 42161 });
    expect(writeContract).toHaveBeenCalled();
    expect(switchChainAsync.mock.invocationCallOrder[0]).toBeLessThan(
      writeContract.mock.invocationCallOrder[0],
    );
  });

  it("doesn't send when the switch is rejected", async () => {
    state.chainId = 1;
    switchChainAsync.mockRejectedValue(new Error("rejected"));
    const { result } = renderHookWithProviders(() => useRetryBridgeMessage());
    await act(() => result.current.retry(item));

    expect(writeContract).not.toHaveBeenCalled();
  });

  it("tells the user when a retry fails", () => {
    state.writeError = new Error("reverted");
    renderHookWithProviders(() => useRetryBridgeMessage());
    expect(toast).toHaveBeenLastCalledWith(
      expect.objectContaining({ writeError: state.writeError }),
    );
  });

  it("waits for the retry's receipt on the destination chain", async () => {
    const { result, rerender } = renderHookWithProviders(() => useRetryBridgeMessage());
    await act(() => result.current.retry(item));
    rerender();
    expect(waitArgs).toHaveBeenLastCalledWith(expect.objectContaining({ chainId: 42161 }));
  });
});
