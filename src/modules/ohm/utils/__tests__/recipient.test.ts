import { describe, expect, it } from "vitest";
import { zeroAddress, type Address } from "viem";
import { resolveRecipient, validateRecipient } from "../recipient";

const WALLET = "0x00000000000000000000000000000000000000c1" as Address;
const CUSTOM = "0x00000000000000000000000000000000000000d1" as Address;

describe("resolveRecipient", () => {
  it("follows the connected wallet when no custom recipient is set", () => {
    expect(resolveRecipient(undefined, WALLET)).toBe(WALLET);
  });

  it("uses the custom recipient when set", () => {
    expect(resolveRecipient(CUSTOM, WALLET)).toBe(CUSTOM);
  });

  it("is undefined with neither", () => {
    expect(resolveRecipient(undefined, undefined)).toBeUndefined();
  });
});

describe("validateRecipient", () => {
  it("accepts a real address", () => {
    expect(validateRecipient(CUSTOM)).toBeUndefined();
  });

  it("rejects a malformed address", () => {
    expect(validateRecipient("0x123")).toBe("Invalid Ethereum address.");
  });

  it("rejects the zero address", () => {
    expect(validateRecipient(zeroAddress)).toBe("OHM can't be sent to the zero address.");
  });
});
