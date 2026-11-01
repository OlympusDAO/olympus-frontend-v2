import { describe, expect, it } from "vitest";
import { classifyWallet } from "../walletKind";

const SAFE_CODE = "0x608060405273";

describe("classifyWallet", () => {
  it("treats the Safe App connector as a Safe, whatever the code reads", () => {
    expect(classifyWallet({ connectorId: "safe", hasThreshold: false })).toBe("safe");
  });

  it("treats code with a threshold as a Safe, as over WalletConnect", () => {
    expect(
      classifyWallet({ connectorId: "walletConnect", code: SAFE_CODE, hasThreshold: true }),
    ).toBe("safe");
  });

  it("treats no code as an EOA", () => {
    expect(classifyWallet({ connectorId: "injected", hasThreshold: false })).toBe("eoa");
    expect(classifyWallet({ code: "0x", hasThreshold: false })).toBe("eoa");
  });

  it("treats an EIP-7702 delegated EOA as an EOA", () => {
    expect(classifyWallet({ code: `0xef0100${"a".repeat(40)}`, hasThreshold: false })).toBe("eoa");
  });

  it("treats other code as a generic contract wallet", () => {
    expect(classifyWallet({ code: SAFE_CODE, hasThreshold: false })).toBe("contract");
  });
});
