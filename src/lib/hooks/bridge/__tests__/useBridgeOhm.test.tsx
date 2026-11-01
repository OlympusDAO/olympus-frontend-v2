import { act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Address } from "viem";
import { renderHookWithProviders } from "@/test/test-utils";
import { arbitrum, mainnet } from "@/lib/chains";
import { ContractName, getContractAddress } from "@/lib/contracts";
import { CCIP_CHAIN_SELECTORS } from "@/modules/ohm/utils/constants";
import { useBridgeOhm } from "../useBridgeOhm";

const writeContract = vi.fn();
const readContract = vi.fn();
const toast = vi.hoisted(() => vi.fn(() => ({ reset: vi.fn() })));
const waitArgs = vi.hoisted(() => vi.fn());
const account = vi.hoisted(() => ({ address: "0x00000000000000000000000000000000000000c1" }));

vi.mock("wagmi", () => ({
  useAccount: () => ({ address: account.address }),
  useConfig: () => ({}),
  useWriteContract: () => ({
    data: undefined,
    writeContract,
    isPending: false,
    error: null,
    reset: vi.fn(),
  }),
  useWaitForTransactionReceipt: (args: unknown) => {
    waitArgs(args);
    return { isLoading: false, isSuccess: false, error: null };
  },
}));

vi.mock("../../useTransactionToast", () => ({ useTransactionToast: toast }));

vi.mock("wagmi/actions", () => ({
  getPublicClient: () => ({ readContract }),
}));

const RECIPIENT = "0x00000000000000000000000000000000000000d1" as Address;

const args = {
  sourceChainId: mainnet.id,
  destinationChainId: arbitrum.id,
  recipientAddress: RECIPIENT,
  amount: 1_000_000_000n,
};

describe("useBridgeOhm", () => {
  beforeEach(() => {
    writeContract.mockReset();
    readContract.mockReset();
    account.address = "0x00000000000000000000000000000000000000c1";
  });

  it("re-reads the fee and sends exactly that value through sendToEVM", async () => {
    readContract.mockResolvedValue(110n);
    const { result } = renderHookWithProviders(() => useBridgeOhm());

    await act(async () => {
      await result.current.bridge({
        sourceChainId: mainnet.id,
        destinationChainId: arbitrum.id,
        recipientAddress: RECIPIENT,
        amount: 1_000_000_000n,
      });
    });

    const selector = CCIP_CHAIN_SELECTORS[arbitrum.id];
    const bridgeAddress = getContractAddress(ContractName.CCIP_BRIDGE, mainnet.id);
    expect(readContract).toHaveBeenCalledWith(
      expect.objectContaining({
        address: bridgeAddress,
        functionName: "getFeeEVM",
        args: [selector, RECIPIENT, 1_000_000_000n],
      }),
    );
    expect(writeContract).toHaveBeenCalledWith(
      expect.objectContaining({
        address: bridgeAddress,
        functionName: "sendToEVM",
        args: [selector, RECIPIENT, 1_000_000_000n],
        value: 110n,
        chainId: mainnet.id,
      }),
    );
  });

  it("does not send and reports the error when the fee can't be read", async () => {
    readContract.mockRejectedValue(new Error("route closed"));
    const { result, rerender } = renderHookWithProviders(() => useBridgeOhm());

    await act(async () => {
      await result.current.bridge({
        sourceChainId: mainnet.id,
        destinationChainId: arbitrum.id,
        recipientAddress: RECIPIENT,
        amount: 1_000_000_000n,
      });
    });
    rerender();

    expect(writeContract).not.toHaveBeenCalled();
    expect(result.current.error?.message).toBe("route closed");
  });

  it("signs as the wallet that started the send", async () => {
    readContract.mockResolvedValue(110n);
    const { result } = renderHookWithProviders(() => useBridgeOhm());
    await act(() => result.current.bridge(args));
    expect(writeContract).toHaveBeenCalledWith(
      expect.objectContaining({ account: account.address }),
    );
  });

  it("doesn't send if the account changed while the fee was being read", async () => {
    let resolveFee: (fee: bigint) => void = () => {};
    readContract.mockReturnValue(new Promise((resolve) => (resolveFee = resolve)));
    const { result, rerender } = renderHookWithProviders(() => useBridgeOhm());

    let pending: Promise<void> = Promise.resolve();
    act(() => {
      pending = result.current.bridge(args);
    });
    account.address = "0x00000000000000000000000000000000000000c2";
    rerender();
    await act(async () => {
      resolveFee(110n);
      await pending;
    });

    expect(writeContract).not.toHaveBeenCalled();
  });

  it("doesn't send if the modal closed while the fee was being read", async () => {
    let resolveFee: (fee: bigint) => void = () => {};
    readContract.mockReturnValue(new Promise((resolve) => (resolveFee = resolve)));
    const { result, unmount } = renderHookWithProviders(() => useBridgeOhm());

    let pending: Promise<void> = Promise.resolve();
    act(() => {
      pending = result.current.bridge(args);
    });
    unmount();
    await act(async () => {
      resolveFee(110n);
      await pending;
    });

    expect(writeContract).not.toHaveBeenCalled();
  });

  it("waits for the receipt on the source chain, not the wallet's", async () => {
    readContract.mockResolvedValue(110n);
    const { result, rerender } = renderHookWithProviders(() => useBridgeOhm());
    await act(() => result.current.bridge(args));
    rerender();
    expect(waitArgs).toHaveBeenLastCalledWith(expect.objectContaining({ chainId: mainnet.id }));
  });

  it("surfaces a failed fee read through the toast", async () => {
    const error = new Error("route closed");
    readContract.mockRejectedValue(error);
    const { result, rerender } = renderHookWithProviders(() => useBridgeOhm());
    await act(() => result.current.bridge(args));
    rerender();
    expect(toast).toHaveBeenLastCalledWith(expect.objectContaining({ writeError: error }));
  });
});

describe("useBridgeOhm with a reverted send", () => {
  it("is not successful, and reports the failure", async () => {
    vi.resetModules();
    vi.doMock("wagmi", () => ({
      useAccount: () => ({ address: account.address }),
      useConfig: () => ({}),
      useWriteContract: () => ({
        data: `0x${"a".repeat(64)}`,
        writeContract,
        isPending: false,
        error: null,
        reset: vi.fn(),
      }),
      useWaitForTransactionReceipt: () => ({
        data: { status: "reverted", logs: [] },
        isLoading: false,
        isSuccess: true,
        error: null,
      }),
    }));
    const { useBridgeOhm: fresh } = await import("../useBridgeOhm");
    const { result } = renderHookWithProviders(() => fresh());

    expect(result.current.isSuccess).toBe(false);
    expect(result.current.error?.message).toMatch(/reverted/i);
  });
});
