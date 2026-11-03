import { describe, expect, it, vi } from "vitest";
import { render, screen, userEvent } from "@/test/test-utils";
import type { RouteState } from "@/lib/hooks/bridge/routeState";
import { BridgeChainSelectorModal } from "../bridge-chain-selector-modal";
import type { BridgeChain } from "../../utils/constants";

vi.mock("@/components/chain-icon.tsx", () => ({ ChainIcon: () => null }));

const chains: BridgeChain[] = [
  { chainId: 42161, name: "Arbitrum", icon: "ArbitrumChainIcon", nativeCurrencySymbol: "ETH" },
  { chainId: 8453, name: "Base", icon: "BaseChainIcon", nativeCurrencySymbol: "ETH" },
];

function renderModal(routeStates?: Record<number, RouteState>) {
  const onSelect = vi.fn();
  const onClose = vi.fn();
  render(
    <BridgeChainSelectorModal
      isOpen
      onClose={onClose}
      title="Select Target Chain"
      chains={chains}
      selectedChainId={42161}
      onSelect={onSelect}
      routeStates={routeStates}
    />,
  );
  return { onSelect, onClose };
}

describe("BridgeChainSelectorModal", () => {
  it("disables an unavailable destination and shows why", async () => {
    const { onSelect } = renderModal({
      8453: { status: "unavailable", reason: "route-paused" },
    });

    const base = screen.getByRole("button", { name: /Base/ });
    expect(base).toBeDisabled();
    expect(base).toHaveTextContent("Route is paused");

    await userEvent.click(base);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("selects an available destination", async () => {
    const { onSelect, onClose } = renderModal({ 8453: { status: "available" } });

    await userEvent.click(screen.getByRole("button", { name: /Base/ }));

    expect(onSelect).toHaveBeenCalledWith(8453);
    expect(onClose).toHaveBeenCalled();
  });

  it("keeps a route selectable while its state is loading", () => {
    renderModal({ 8453: { status: "loading" } });
    expect(screen.getByRole("button", { name: /Base/ })).toBeEnabled();
  });

  it("works with no route states, as for the source chain list", () => {
    renderModal();
    expect(screen.getByRole("button", { name: /Base/ })).toBeEnabled();
  });
});
