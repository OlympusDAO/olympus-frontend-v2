import { beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "@testing-library/react";
import type { Address } from "viem";
import { render, screen, userEvent } from "@/test/test-utils";
import { BridgePage } from "../bridge-page";

const WALLET_A = "0x00000000000000000000000000000000000000a1" as Address;
const WALLET_B = "0x00000000000000000000000000000000000000b1" as Address;

const state = vi.hoisted(() => ({
  address: "0x00000000000000000000000000000000000000a1" as string | undefined,
  route: { status: "available" } as Record<string, unknown>,
  feeCalls: [] as Array<{ recipientAddress?: string }>,
  nativeFee: 1000n as bigint | undefined,
  feeError: null as Error | null,
}));

vi.mock("wagmi", () => ({
  useAccount: () => ({ address: state.address, isConnected: !!state.address }),
  useChainId: () => 1,
  useSwitchChain: () => ({ switchChain: vi.fn() }),
  useBalance: () => ({ data: { value: 10n ** 18n } }),
  useBytecode: () => ({ data: undefined }),
}));
// vitest has no svgr transform, so `?react` icons can't render.
vi.mock("@/components/chain-icon.tsx", () => ({ ChainIcon: () => null }));
vi.mock("@/components/icon.tsx", () => ({ Icon: () => null }));
// number-flow's web component doesn't work in jsdom.
vi.mock("@/components/ui/number-flow.tsx", () => ({ NumberFlow: () => null }));
vi.mock("@/lib/hooks/bridge/useBridgeRoute", () => ({
  useBridgeRoute: () => state.route,
  useBridgeRoutes: () => ({}),
}));
vi.mock("@/lib/hooks/bridge/useBridgeLimits", () => ({
  useBridgeLimits: () => ({ status: "ok", isLoading: false }),
}));
vi.mock("@/lib/hooks/bridge/useEstimateBridgeFee", () => ({
  useEstimateBridgeFee: (args: { recipientAddress?: string }) => {
    state.feeCalls.push(args);
    return { nativeFee: state.nativeFee, isLoading: false, error: state.feeError };
  },
}));
vi.mock("@/lib/hooks/useTokenBalance", () => ({
  useTokenBalance: () => ({ balance: 5_000_000_000n }),
}));
vi.mock("@/lib/hooks/useTokenAllowance.tsx", () => ({
  useTokenAllowance: () => ({ allowance: 10n ** 18n }),
}));
vi.mock("@/lib/hooks/useTokenPrice.tsx", () => ({ useTokenPrice: () => ({ price: 20 }) }));
vi.mock("../../components/bridge-history", () => ({
  BridgeHistory: () => <div>history</div>,
}));
vi.mock("../../components/bridge-confirm-modal", () => ({
  BridgeConfirmModal: ({ recipientAddress }: { recipientAddress: string }) => (
    <div data-testid="confirm-modal">{recipientAddress}</div>
  ),
}));

function lastRecipient() {
  return state.feeCalls.at(-1)?.recipientAddress;
}

describe("BridgePage", () => {
  beforeEach(() => {
    state.address = WALLET_A;
    state.route = { status: "available" };
    state.feeCalls = [];
    state.nativeFee = 1000n;
    state.feeError = null;
  });

  it("sends to the new wallet after switching accounts", () => {
    const { rerender } = render(<BridgePage />);
    expect(lastRecipient()).toBe(WALLET_A);

    state.address = WALLET_B;
    rerender(<BridgePage />);
    expect(lastRecipient()).toBe(WALLET_B);
  });

  it("renders the form and history when the route is unavailable", () => {
    state.route = { status: "unavailable", reason: "unreachable" };
    render(<BridgePage />);

    expect(screen.getByRole("button", { name: "Bridge Unavailable" })).toBeDisabled();
    expect(screen.getByText("Couldn't check this route")).toBeInTheDocument();
    expect(screen.getByText("history")).toBeInTheDocument();
  });

  it("doesn't offer a confirm step that can't open when the fee can't be read", async () => {
    state.nativeFee = undefined;
    state.feeError = new Error("reverted");
    render(<BridgePage />);

    await userEvent.type(screen.getByPlaceholderText("0.00"), "1");

    expect(screen.getByRole("button", { name: "Bridge Unavailable" })).toBeDisabled();
  });

  it("closes the confirm modal when the connected account changes", async () => {
    const { rerender } = render(<BridgePage />);
    await userEvent.type(screen.getByPlaceholderText("0.00"), "1");
    await userEvent.click(screen.getByRole("button", { name: "Bridge OHM" }));
    expect(screen.getByTestId("confirm-modal")).toHaveTextContent(WALLET_A);

    state.address = WALLET_B;
    await act(async () => rerender(<BridgePage />));

    expect(screen.queryByTestId("confirm-modal")).not.toBeInTheDocument();
  });

  it.each([
    [".", "Enter Amount"],
    ["1.12345678912", "Bridge OHM"],
    ["999999", "Insufficient OHM Balance"],
  ])("doesn't throw on amount %j", async (input, label) => {
    render(<BridgePage />);
    await userEvent.type(screen.getByPlaceholderText("0.00"), input);
    expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
  });
});
