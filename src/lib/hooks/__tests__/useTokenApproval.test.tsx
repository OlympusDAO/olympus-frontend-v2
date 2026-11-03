import { act } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderHookWithProviders } from "@/test/test-utils";
import { useTokenApproval } from "../useTokenApproval";

const writeContract = vi.hoisted(() => vi.fn());
const waitArgs = vi.hoisted(() => vi.fn());

vi.mock("wagmi", () => ({
  useWriteContract: () => ({ writeContract, isPending: false, error: null, reset: vi.fn() }),
  useWaitForTransactionReceipt: (args: unknown) => {
    waitArgs(args);
    return { isLoading: false, isSuccess: false, error: null };
  },
}));

describe("useTokenApproval", () => {
  it("writes and waits on the chain it was asked to approve on", () => {
    const { result, rerender } = renderHookWithProviders(() => useTokenApproval());
    act(() =>
      result.current.approve({
        tokenAddress: "0x00000000000000000000000000000000000000a1",
        spender: "0x00000000000000000000000000000000000000a2",
        amount: 1n,
        chainId: 42161,
      }),
    );
    rerender();

    expect(writeContract).toHaveBeenCalledWith(expect.objectContaining({ chainId: 42161 }));
    expect(waitArgs).toHaveBeenLastCalledWith(expect.objectContaining({ chainId: 42161 }));
  });
});
