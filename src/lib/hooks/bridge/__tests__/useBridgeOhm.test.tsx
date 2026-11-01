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

vi.mock("wagmi", () => ({
  useAccount: () => ({ address: "0x00000000000000000000000000000000000000c1" }),
  useConfig: () => ({}),
  useWriteContract: () => ({
    data: undefined,
    writeContract,
    isPending: false,
    error: null,
    reset: vi.fn(),
  }),
  useWaitForTransactionReceipt: () => ({ isLoading: false, isSuccess: false, error: null }),
}));

vi.mock("wagmi/actions", () => ({
  getPublicClient: () => ({ readContract }),
}));

const RECIPIENT = "0x00000000000000000000000000000000000000d1" as Address;

describe("useBridgeOhm", () => {
  beforeEach(() => {
    writeContract.mockReset();
    readContract.mockReset();
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
});
