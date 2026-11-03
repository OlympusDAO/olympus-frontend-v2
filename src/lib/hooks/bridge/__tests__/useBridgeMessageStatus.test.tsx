import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHookWithProviders, waitFor } from "@/test/test-utils";
import { useBridgeMessageStatus } from "../useBridgeMessageStatus";

const state = vi.hoisted(() => ({
  apiStatus: "SUCCESS",
  stored: undefined as { sourceChainSelector: bigint } | undefined,
}));

vi.mock("wagmi", () => ({
  useReadContract: () => ({ data: state.stored }),
}));
vi.mock("../ccipApi", async (original) => ({
  ...(await original<typeof import("../ccipApi")>()),
  fetchMessage: async () => ({
    status: state.apiStatus,
    readyForManualExecution: false,
    sourceNetworkInfo: { chainId: "1" },
    destNetworkInfo: { chainId: "42161" },
  }),
}));

const MESSAGE_ID = `0x${"ab".repeat(32)}` as const;

describe("useBridgeMessageStatus", () => {
  beforeEach(() => {
    state.apiStatus = "SUCCESS";
    state.stored = undefined;
  });

  it("is in flight before the API has the message", () => {
    const { result } = renderHookWithProviders(() => useBridgeMessageStatus(undefined, 42161));
    expect(result.current).toBe("INFLIGHT");
  });

  it("is delivered once CCIP succeeded and the bridge has no stored failure", async () => {
    state.stored = { sourceChainSelector: 0n };
    const { result } = renderHookWithProviders(() => useBridgeMessageStatus(MESSAGE_ID, 42161));
    await waitFor(() => expect(result.current).toBe("DELIVERED"));
  });

  it("needs a retry when the bridge stored a failure", async () => {
    state.stored = { sourceChainSelector: 1n };
    const { result } = renderHookWithProviders(() => useBridgeMessageStatus(MESSAGE_ID, 42161));
    await waitFor(() => expect(result.current).toBe("NEEDS_RETRY"));
  });

  it("doesn't claim delivery before the bridge has been read", async () => {
    const { result } = renderHookWithProviders(() => useBridgeMessageStatus(MESSAGE_ID, 42161));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(result.current).toBe("INFLIGHT");
  });
});
