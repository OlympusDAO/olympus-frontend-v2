import { describe, expect, it } from "vitest";
import {
  BERACHAIN_NATIVE_TOKEN_ADDRESS,
  EVM_NATIVE_TOKEN_ADDRESS,
  getDisplayTokenName,
  getNativeTokenContract,
} from "@/modules/pulse/hooks/useReserveBalances";

describe("getDisplayTokenName", () => {
  it("labels supported native-token zero-address rows by chain", () => {
    expect(
      getDisplayTokenName(
        "0x0000000000000000000000000000000000000000",
        "Ethereum",
        "0x0000000000000000000000000000000000000000",
      ),
    ).toBe("ETH");
    expect(
      getDisplayTokenName(
        "0x0000000000000000000000000000000000000000",
        "Berachain",
        "0x0000000000000000000000000000000000000000",
      ),
    ).toBe("BERA");
  });

  it("uses tokenAddress when the token field is not the zero address", () => {
    expect(
      getDisplayTokenName(
        "Native Gas Token",
        "Ethereum",
        "0x0000000000000000000000000000000000000000",
      ),
    ).toBe("ETH");
  });

  it("matches mixed-case zero-address rows", () => {
    expect(
      getDisplayTokenName(
        "0x0000000000000000000000000000000000000000",
        "Ethereum",
        "0x0000000000000000000000000000000000000000".toUpperCase(),
      ),
    ).toBe("ETH");
  });

  it("uses a generic label for unknown-chain native-token rows", () => {
    expect(
      getDisplayTokenName(
        "0x0000000000000000000000000000000000000000",
        "Unknown",
        "0x0000000000000000000000000000000000000000",
      ),
    ).toBe("Native Token");
  });

  it("uses a generic label for undefined-chain native-token rows", () => {
    expect(getDisplayTokenName("0x0000000000000000000000000000000000000000")).toBe("Native Token");
  });

  it("preserves Cooler receivable labels", () => {
    expect(getDisplayTokenName("USDS - Borrowed Through Cooler Loans V2")).toBe(
      "Cooler Loan USDS Receivables",
    );
    expect(getDisplayTokenName("DAI - Borrowed Through Cooler Loans")).toBe(
      "Cooler Loan DAI Receivables",
    );
  });
});

describe("getNativeTokenContract", () => {
  it("maps EVM native-token rows to the EIP-7528 address", () => {
    expect(
      getNativeTokenContract(
        "0x0000000000000000000000000000000000000000",
        "Ethereum",
        "0x0000000000000000000000000000000000000000",
      ),
    ).toEqual({
      displayName: "ETH",
      contractName: "ETH",
      tokenAddress: EVM_NATIVE_TOKEN_ADDRESS,
    });

    expect(
      getNativeTokenContract(
        "0x0000000000000000000000000000000000000000",
        "Arbitrum",
        "0x0000000000000000000000000000000000000000",
      ),
    ).toEqual({
      displayName: "ETH",
      contractName: "ETH",
      tokenAddress: EVM_NATIVE_TOKEN_ADDRESS,
    });
  });

  it("maps Berachain native-token rows to the WBERA vanity address", () => {
    expect(
      getNativeTokenContract(
        "0x0000000000000000000000000000000000000000",
        "Berachain",
        "0x0000000000000000000000000000000000000000",
      ),
    ).toEqual({
      displayName: "BERA",
      contractName: "WBERA",
      tokenAddress: BERACHAIN_NATIVE_TOKEN_ADDRESS,
    });
  });

  it("maps supported non-ETH native-token chains", () => {
    expect(
      getNativeTokenContract(
        "0x0000000000000000000000000000000000000000",
        "Fantom",
        "0x0000000000000000000000000000000000000000",
      ),
    ).toEqual({
      displayName: "FTM",
      contractName: "FTM",
      tokenAddress: EVM_NATIVE_TOKEN_ADDRESS,
    });
    expect(
      getNativeTokenContract(
        "0x0000000000000000000000000000000000000000",
        "Polygon",
        "0x0000000000000000000000000000000000000000",
      ),
    ).toEqual({
      displayName: "POL",
      contractName: "POL",
      tokenAddress: EVM_NATIVE_TOKEN_ADDRESS,
    });
  });

  it("does not attach contract metadata for unsupported native-token chains", () => {
    expect(
      getNativeTokenContract(
        "0x0000000000000000000000000000000000000000",
        "Unknown",
        "0x0000000000000000000000000000000000000000",
      ),
    ).toBeUndefined();
  });
});
