import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { parseUnits } from "viem";
import { CoolerDelegationModal } from "../cooler-delegation-modal";

const WALLET = "0x1111111111111111111111111111111111111111";
const DELEGATE = "0x2222222222222222222222222222222222222222";
const ESCROW = "0x3333333333333333333333333333333333333333";

// wagmi keeps `data` referentially stable between renders, so the mock returns the same reference.
const chainState = vi.hoisted(() => ({
  rawDelegations: [] as readonly { delegate: string; amount: bigint; escrow: string }[],
}));

vi.mock("@/icons", () => ({
  GOHMTokenIcon: () => <span />,
}));

vi.mock("wagmi", () => ({
  useAccount: () => ({ address: "0x1111111111111111111111111111111111111111" }),
  useReadContract: () => ({
    data: chainState.rawDelegations,
    isLoading: false,
    queryKey: ["delegations"],
  }),
  useWriteContract: () => ({
    data: undefined,
    writeContract: vi.fn(),
    isPending: false,
    error: null,
    reset: vi.fn(),
  }),
  useWaitForTransactionReceipt: () => ({ isLoading: false, isSuccess: false, error: null }),
}));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

vi.mock("@/lib/hooks/useTransactionToast", () => ({
  useTransactionToast: () => ({ reset: vi.fn() }),
}));

vi.mock("@/lib/analytics", () => ({
  trackMonoCoolerDelegation: vi.fn(),
  trackTransactionFailed: vi.fn(),
}));

vi.mock("@/lib/hooks/cooler/useMonoCoolerPosition", () => ({
  useMonoCoolerPosition: () => ({
    position: { collateral: 5_000_000_000_000_000_000n, maxDelegateAddresses: 10n },
  }),
}));

function renderModal() {
  return render(<CoolerDelegationModal open onClose={vi.fn()} />);
}

describe("CoolerDelegationModal", () => {
  beforeEach(() => {
    chainState.rawDelegations = [];
  });

  it("keeps the address and amount a user types", async () => {
    const user = userEvent.setup();
    renderModal();

    await user.type(screen.getByPlaceholderText("Delegate Address"), DELEGATE);
    await user.type(screen.getByPlaceholderText("0.0000"), "1.5");

    expect(screen.getByPlaceholderText("Delegate Address")).toHaveValue(DELEGATE);
    expect(screen.getByPlaceholderText("0.0000")).toHaveValue("1.5");
    expect(screen.getByRole("button", { name: "Delegate Voting" })).toBeEnabled();
  });

  it("fills the form when Set to My Wallet is clicked", async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getByRole("button", { name: "Set to My Wallet" }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Delegate Address")).toHaveValue(WALLET);
    });
    expect(screen.getByPlaceholderText("0.0000")).toHaveValue("5");
  });

  it("lets a user edit an existing delegation", async () => {
    chainState.rawDelegations = [
      { delegate: DELEGATE, amount: parseUnits("2", 18), escrow: ESCROW },
    ];
    const user = userEvent.setup();
    renderModal();

    const amount = await screen.findByDisplayValue("2");
    await user.type(amount, ".5");

    expect(screen.getByPlaceholderText("0.0000")).toHaveValue("2.5");
    expect(screen.getByRole("button", { name: "Delegate Voting" })).toBeEnabled();
  });

  it("resyncs the form when on-chain delegations change", async () => {
    const { rerender } = renderModal();
    expect(screen.getByPlaceholderText("Delegate Address")).toHaveValue("");

    chainState.rawDelegations = [
      { delegate: DELEGATE, amount: parseUnits("2", 18), escrow: ESCROW },
    ];
    rerender(<CoolerDelegationModal open onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Delegate Address")).toHaveValue(DELEGATE);
    });
    expect(screen.getByPlaceholderText("0.0000")).toHaveValue("2");
  });
});
