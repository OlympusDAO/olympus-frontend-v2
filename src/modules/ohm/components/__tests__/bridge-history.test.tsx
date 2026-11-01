import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@/test/test-utils";
import type { BridgeHistoryItem } from "@/lib/hooks/bridge/useBridgeHistory";
import { BridgeHistory } from "../bridge-history";

const state = vi.hoisted(() => ({
  history: [] as BridgeHistoryItem[],
  error: null as Error | null,
  partialError: false,
}));

vi.mock("wagmi", () => ({
  useAccount: () => ({ address: "0x00000000000000000000000000000000000000c1" }),
}));
vi.mock("@/lib/hooks/bridge/useBridgeHistory.ts", () => ({
  useBridgeHistory: () => ({ ...state, isLoading: false }),
}));
vi.mock("@/lib/hooks/bridge/useRetryBridgeMessage", () => ({
  useRetryBridgeMessage: () => ({ retry: vi.fn(), isPending: false }),
}));
vi.mock("@/components/chain-icon.tsx", () => ({ ChainIcon: () => null }));
vi.mock("@/components/icon.tsx", () => ({ Icon: () => null }));
vi.mock("@/components/explorer-link.tsx", () => ({
  ExplorerLink: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));
vi.mock("@/components/ui/number-flow.tsx", () => ({
  NumberFlow: ({ value }: { value: number }) => <span>{value}</span>,
}));

const row: BridgeHistoryItem = {
  source: "layerzero",
  srcChainId: 1,
  dstChainId: 42161,
  timestamp: "2026-11-01T10:00:00.000Z",
  amount: "1",
  srcTxHash: `0x${"a".repeat(64)}`,
  status: "DELIVERED",
};

describe("BridgeHistory", () => {
  beforeEach(() => {
    state.history = [];
    state.error = null;
    state.partialError = false;
  });

  it("shows an error state, not an empty one, when history can't load", () => {
    state.error = new Error("down");
    render(<BridgeHistory />);

    expect(screen.getByText("Couldn't load bridge history.")).toBeInTheDocument();
    expect(screen.queryByText("No bridging activity yet.")).not.toBeInTheDocument();
  });

  it("shows what loaded and a notice when one source fails", () => {
    state.history = [row];
    state.partialError = true;
    render(<BridgeHistory />);

    expect(screen.getByText("Delivered")).toBeInTheDocument();
    expect(screen.getByText(/Some bridge history couldn't be loaded/)).toBeInTheDocument();
  });

  it("shows a dash when a row has no amount", () => {
    state.history = [{ ...row, amount: undefined }];
    render(<BridgeHistory />);

    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("shows the empty state when nothing failed and there's no history", () => {
    render(<BridgeHistory />);
    expect(screen.getByText("No bridging activity yet.")).toBeInTheDocument();
  });
});

describe("BridgeHistory CCIP rows", () => {
  const MESSAGE_ID = `0x${"ab".repeat(32)}` as const;
  const ccip: BridgeHistoryItem = { ...row, source: "ccip", messageId: MESSAGE_ID };

  beforeEach(() => {
    state.error = null;
    state.partialError = false;
  });

  it.each([
    ["DELIVERED", "Delivered"],
    ["INFLIGHT", "In Flight"],
    ["NEEDS_RETRY", "Needs Retry"],
    ["NEEDS_RECOVERY", "Needs Recovery"],
    ["AWAITING_SIGNATURES", "Awaiting Signatures"],
    ["FAILED", "Failed"],
  ] as const)("labels %s as %s", (status, label) => {
    state.history = [{ ...ccip, status }];
    render(<BridgeHistory />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it("offers Retry on a Needs Retry row", () => {
    state.history = [{ ...ccip, status: "NEEDS_RETRY" }];
    render(<BridgeHistory />);
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("links a Needs Recovery row to the explorer, with no Retry", () => {
    state.history = [{ ...ccip, status: "NEEDS_RECOVERY" }];
    render(<BridgeHistory />);
    expect(screen.queryByRole("button", { name: "Retry" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Track on CCIP Explorer" })).toHaveAttribute(
      "href",
      `https://ccip.chain.link/msg/${MESSAGE_ID}`,
    );
  });

  it("has no CCIP Explorer link on a LayerZero row", () => {
    state.history = [row];
    render(<BridgeHistory />);
    expect(screen.queryByRole("link", { name: "Track on CCIP Explorer" })).not.toBeInTheDocument();
  });
});
