import { describe, expect, it } from "vitest";
import { clampOhmDecimals, getBridgeCta, parseOhmAmount, type BridgeCtaInput } from "../bridgeCta";

const ready: BridgeCtaInput = {
  isConnected: true,
  walletChainId: 42161,
  source: { chainId: 42161, name: "Arbitrum", nativeCurrencySymbol: "ETH" },
  route: { status: "available" },
  amount: 1_000_000_000n,
  ohmBalance: 5_000_000_000n,
  amountStatus: "ok",
  nativeBalance: 10n ** 18n,
  nativeFee: 1000n,
  hasSufficientAllowance: true,
};

describe("getBridgeCta", () => {
  it.each<[string, Partial<BridgeCtaInput>, string, boolean, string]>([
    ["no wallet", { isConnected: false }, "Connect Wallet", true, "connect"],
    ["route loading", { route: { status: "loading" } }, "Checking Bridge…", true, "none"],
    [
      "route unavailable",
      { route: { status: "unavailable", reason: "bridge-disabled" } },
      "Bridge Unavailable",
      true,
      "none",
    ],
    ["wrong network", { walletChainId: 1 }, "Switch to Arbitrum", false, "switch"],
    ["no amount", { amount: 0n }, "Enter Amount", true, "none"],
    ["over balance", { amount: 6_000_000_000n }, "Insufficient OHM Balance", true, "none"],
    [
      "over route limit",
      { amountStatus: "exceeds-route-limit" },
      "Exceeds Route Limit",
      true,
      "none",
    ],
    [
      "over liquidity",
      { amountStatus: "exceeds-liquidity" },
      "Exceeds Available Liquidity",
      true,
      "none",
    ],
    ["liquidity unread", { amountStatus: "unverified" }, "Checking Bridge…", true, "none"],
    ["no native for fee", { nativeBalance: 999n }, "Insufficient ETH for Fees", true, "none"],
    ["fee not yet read", { nativeFee: undefined }, "Estimating Fee…", true, "none"],
    [
      "no allowance",
      { hasSufficientAllowance: false },
      "Approve OHM for Bridging",
      false,
      "confirm",
    ],
    ["near limit can still send", { amountStatus: "near-limit" }, "Bridge OHM", false, "confirm"],
    ["ready", {}, "Bridge OHM", false, "confirm"],
  ])("%s", (_name, overrides, label, disabled, action) => {
    expect(getBridgeCta({ ...ready, ...overrides })).toEqual({ label, disabled, action });
  });

  it("puts route state ahead of a wrong network", () => {
    expect(
      getBridgeCta({
        ...ready,
        walletChainId: 1,
        route: { status: "unavailable", reason: "route-paused" },
      }).label,
    ).toBe("Bridge Unavailable");
  });
});

describe("getBridgeCta for a Safe", () => {
  it("waits until it knows what kind of wallet this is", () => {
    expect(getBridgeCta({ ...ready, walletUnknown: true })).toEqual({
      label: "Checking Wallet…",
      disabled: true,
      action: "none",
    });
  });

  it("requires a recipient when the Safe isn't on the destination", () => {
    expect(getBridgeCta({ ...ready, needsRecipient: true })).toEqual({
      label: "Enter a Recipient",
      disabled: true,
      action: "none",
    });
  });

  it("never offers a network switch inside the Safe App", () => {
    expect(getBridgeCta({ ...ready, walletChainId: 1, isSafeApp: true })).toEqual({
      label: "Open this Safe on Arbitrum",
      disabled: true,
      action: "none",
    });
  });

  it("offers one proposal step even without an allowance", () => {
    expect(getBridgeCta({ ...ready, isSafe: true, hasSufficientAllowance: false })).toEqual({
      label: "Propose in Safe",
      disabled: false,
      action: "confirm",
    });
  });
});

describe("parseOhmAmount", () => {
  it.each([
    ["", 0n],
    [".", 0n],
    ["0", 0n],
    ["abc", 0n],
    ["1.5", 1_500_000_000n],
  ])("parses %j", (input, expected) => {
    expect(parseOhmAmount(input)).toBe(expected);
  });
});

describe("clampOhmDecimals", () => {
  it("cuts input past OHM's 9 decimals so the amount sent matches the amount shown", () => {
    expect(clampOhmDecimals("1.1234567891")).toBe("1.123456789");
  });

  it("leaves shorter input alone", () => {
    expect(clampOhmDecimals("1.5")).toBe("1.5");
    expect(clampOhmDecimals(".")).toBe(".");
    expect(clampOhmDecimals("12")).toBe("12");
  });
});
