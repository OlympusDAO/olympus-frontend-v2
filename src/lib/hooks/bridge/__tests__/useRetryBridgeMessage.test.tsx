import { act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHookWithProviders } from "@/test/test-utils";
import { ContractName, getContractAddress } from "@/lib/contracts";
import { useRetryBridgeMessage } from "../useRetryBridgeMessage";
import type { BridgeHistoryItem } from "../useBridgeHistory";

const writeContract = vi.fn();
const switchChainAsync = vi.fn();
const state = vi.hoisted(() => ({ chainId: 42161 }));

vi.mock("wagmi", () => ({
  useChainId: () => state.chainId,
  useSwitchChain: () => ({ switchChainAsync }),
  useWriteContract: () => ({
    data: undefined,
    writeContract,
    isPending: false,
    error: null,
    reset: vi.fn(),
  }),
  useWaitForTransactionReceipt: () => ({ isLoading: false, isSuccess: false, error: null }),
}));

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
});
