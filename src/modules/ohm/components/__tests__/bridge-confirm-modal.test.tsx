import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, userEvent } from "@/test/test-utils";
import { readTrackedTransfers } from "@/lib/hooks/bridge/trackedTransfers";
import { BridgeConfirmModal } from "../bridge-confirm-modal";

const WALLET = "0x00000000000000000000000000000000000000c1";
const RECIPIENT = "0x00000000000000000000000000000000000000d1";
const HASH = `0x${"a".repeat(64)}`;

const state = vi.hoisted(() => ({
  chainId: 1,
  route: { status: "available" } as Record<string, unknown>,
  amountStatus: "ok",
  allowance: 10n ** 18n,
  hash: undefined as string | undefined,
  isSuccess: false,
}));
const bridge = vi.hoisted(() => vi.fn());
const switchChain = vi.hoisted(() => vi.fn());

vi.mock("wagmi", () => ({
  useAccount: () => ({ address: "0x00000000000000000000000000000000000000c1" }),
  useChainId: () => state.chainId,
  useSwitchChain: () => ({ switchChain }),
}));
vi.mock("@/components/chain-icon.tsx", () => ({ ChainIcon: () => null }));
vi.mock("@/lib/analytics.ts", () => ({ trackBridgeOhm: vi.fn(), trackTransactionFailed: vi.fn() }));
vi.mock("@/lib/hooks/bridge/useBridgeRoute", () => ({ useBridgeRoute: () => state.route }));
vi.mock("@/lib/hooks/bridge/useBridgeLimits", () => ({
  useBridgeLimits: () => ({ status: state.amountStatus, isLoading: false }),
}));
vi.mock("@/lib/hooks/bridge/useBridgeMessageStatus", () => ({
  useBridgeMessageStatus: () => "INFLIGHT",
}));
vi.mock("@/lib/hooks/useTokenAllowance.tsx", () => ({
  useTokenAllowance: () => ({ allowance: state.allowance, queryKey: [] }),
}));
vi.mock("@/lib/hooks/useTokenApproval.tsx", () => ({
  useTokenApproval: () => ({ approve: vi.fn(), isPending: false, isSuccess: false }),
}));
vi.mock("@/lib/hooks/bridge/useBridgeOhm.ts", () => ({
  useBridgeOhm: () => ({
    bridge,
    isPending: false,
    isSuccess: state.isSuccess,
    error: null,
    hash: state.hash,
    messageId: undefined,
  }),
}));

function renderModal() {
  return render(
    <BridgeConfirmModal
      isOpen
      onClose={vi.fn()}
      sourceChainId={1}
      destinationChainId={42161}
      amount="1"
      recipientAddress={RECIPIENT}
    />,
  );
}

describe("BridgeConfirmModal", () => {
  beforeEach(() => {
    localStorage.clear();
    bridge.mockReset();
    switchChain.mockReset();
    state.chainId = 1;
    state.route = { status: "available" };
    state.amountStatus = "ok";
    state.allowance = 10n ** 18n;
    state.hash = undefined;
    state.isSuccess = false;
  });

  it("sends when everything checks out", async () => {
    renderModal();
    await userEvent.click(screen.getByRole("button", { name: "Bridge OHM" }));
    expect(bridge).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceChainId: 1,
        destinationChainId: 42161,
        recipientAddress: RECIPIENT,
      }),
    );
  });

  it("shows who receives the OHM", () => {
    renderModal();
    expect(screen.getByText(/0x0000\.\.\.00d1|0x0000…00d1/)).toBeInTheDocument();
  });

  it("blocks the send if the route closes while it's open", async () => {
    state.route = { status: "unavailable", reason: "route-paused" };
    renderModal();
    const button = screen.getByRole("button", { name: "Bridge Unavailable" });
    expect(button).toBeDisabled();
    expect(bridge).not.toHaveBeenCalled();
  });

  it.each([
    ["exceeds-route-limit", "Exceeds Route Limit"],
    ["exceeds-liquidity", "Exceeds Available Liquidity"],
    ["unverified", "Checking Bridge…"],
  ])("blocks the send on %s", (amountStatus, label) => {
    state.amountStatus = amountStatus;
    renderModal();
    expect(screen.getByRole("button", { name: label })).toBeDisabled();
  });

  it("asks to switch back when the wallet moved to another network", async () => {
    state.chainId = 8453;
    renderModal();
    await userEvent.click(screen.getByRole("button", { name: "Switch to Ethereum" }));
    expect(switchChain).toHaveBeenCalledWith({ chainId: 1 });
    expect(bridge).not.toHaveBeenCalled();
  });

  it("records the transfer as soon as there's a hash, before the receipt", () => {
    state.hash = HASH;
    renderModal();
    expect(readTrackedTransfers(WALLET)).toMatchObject([{ srcTxHash: HASH, dstChainId: 42161 }]);
  });
});
