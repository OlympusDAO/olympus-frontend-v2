import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, userEvent } from "@/test/test-utils";
import { BridgeSafeConfirmModal } from "../bridge-safe-confirm-modal";

const state = vi.hoisted(() => ({
  chainId: 1,
  route: { status: "available" } as Record<string, unknown>,
  amountStatus: "ok",
  safeTxHash: undefined as string | undefined,
  price: 2000 as number | undefined,
  safeStatus: { confirmations: 1, required: 3 } as Record<string, unknown>,
}));
const propose = vi.hoisted(() => vi.fn());

vi.mock("wagmi", () => ({
  useAccount: () => ({ address: "0x00000000000000000000000000000000000000c1" }),
  useChainId: () => state.chainId,
  useSwitchChain: () => ({ switchChain: vi.fn() }),
}));
vi.mock("@/components/chain-icon.tsx", () => ({ ChainIcon: () => null }));
vi.mock("@/lib/hooks/bridge/useBridgeRoute", () => ({ useBridgeRoute: () => state.route }));
vi.mock("@/lib/hooks/bridge/useBridgeLimits", () => ({
  useBridgeLimits: () => ({ status: state.amountStatus }),
}));
vi.mock("@/lib/hooks/bridge/useEstimateBridgeFee", () => ({
  useEstimateBridgeFee: () => ({ nativeFee: 10n ** 15n, isLoading: false, error: null }),
}));
vi.mock("@/lib/hooks/bridge/useNativePrice", () => ({
  useNativePrice: () => state.price,
}));
vi.mock("@/lib/hooks/useTokenAllowance.tsx", () => ({
  useTokenAllowance: () => ({ allowance: 0n }),
}));
vi.mock("@/lib/hooks/bridge/useSafeBridge", () => ({
  useSafeBridge: () => ({ propose, safeTxHash: state.safeTxHash, isPending: false, error: null }),
}));
vi.mock("@/lib/hooks/bridge/useSafeTransferStatus", () => ({
  useSafeTransferStatus: () => state.safeStatus,
}));

function renderModal() {
  return render(
    <BridgeSafeConfirmModal
      isOpen
      onClose={vi.fn()}
      sourceChainId={1}
      destinationChainId={42161}
      amount="1"
      recipientAddress="0x00000000000000000000000000000000000000d1"
    />,
  );
}

describe("BridgeSafeConfirmModal", () => {
  beforeEach(() => {
    propose.mockReset();
    state.chainId = 1;
    state.route = { status: "available" };
    state.amountStatus = "ok";
    state.safeTxHash = undefined;
    state.price = 2000;
    state.safeStatus = { confirmations: 1, required: 3 };
  });

  it("shows the exact fee and most it can overpay, in native token and USD, before signing", () => {
    renderModal();
    expect(screen.getByText("Exact fee now")).toBeInTheDocument();
    expect(screen.getByText("0.001 ETH ($2.00)")).toBeInTheDocument();
    expect(screen.getByText("Buffer")).toBeInTheDocument();
    expect(screen.getByText("0.00025 ETH ($0.50)")).toBeInTheDocument();
    expect(screen.getByText("Sent with the transaction")).toBeInTheDocument();
    expect(screen.getByText("0.00125 ETH ($2.50)")).toBeInTheDocument();
    expect(screen.getByText(/isn't refunded/)).toBeInTheDocument();
  });

  it("is honest that a falling fee can cost more than the buffer", () => {
    renderModal();
    expect(screen.getByText(/If the fee falls, more than the buffer is kept/)).toBeInTheDocument();
  });

  it("warns that the route is only checked now, not at execution", () => {
    renderModal();
    expect(screen.getByText(/Check the route is still open before executing/)).toBeInTheDocument();
  });

  it("leaves USD out when there's no price", () => {
    state.price = undefined;
    renderModal();
    expect(screen.getByText("0.001 ETH")).toBeInTheDocument();
  });

  it("proposes with approval when the allowance is short", async () => {
    renderModal();
    await userEvent.click(screen.getByRole("button", { name: "Propose in Safe" }));
    expect(propose).toHaveBeenCalledWith(
      expect.objectContaining({
        needsApproval: true,
        destinationChainId: 42161,
        amount: "1",
        quote: 10n ** 15n,
      }),
    );
  });

  it("blocks the proposal if the route closes", () => {
    state.route = { status: "unavailable", reason: "route-paused" };
    renderModal();
    expect(screen.getByRole("button", { name: "Bridge Unavailable" })).toBeDisabled();
  });

  it("shows awaiting signatures with a queue link once proposed, not a spinner", () => {
    state.safeTxHash = `0x${"a".repeat(64)}`;
    renderModal();
    expect(screen.getByText("Awaiting signatures (1 of 3)")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open Safe queue" })).toHaveAttribute(
      "href",
      "https://app.safe.global/transactions/queue?safe=eth:0x00000000000000000000000000000000000000c1",
    );
  });

  it("tells signers to propose again after a reverted execution", () => {
    state.safeTxHash = `0x${"a".repeat(64)}`;
    state.safeStatus = { isExecuted: true, isSuccessful: false };
    renderModal();
    expect(screen.getByText("Execution reverted, propose again")).toBeInTheDocument();
  });

  it("points to history once executed", () => {
    state.safeTxHash = `0x${"a".repeat(64)}`;
    state.safeStatus = { isExecuted: true, isSuccessful: true };
    renderModal();
    expect(
      screen.getByText("Executed. Track delivery in your bridge history."),
    ).toBeInTheDocument();
  });
});
