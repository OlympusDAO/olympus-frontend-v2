import { describe, expect, it } from "vitest";
import { getDisplayTokenName } from "../useReserveBalances";

describe("getDisplayTokenName", () => {
  it("labels native-token zero-address rows by chain", () => {
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
    expect(
      getDisplayTokenName(
        "0x0000000000000000000000000000000000000000",
        "Fantom",
        "0x0000000000000000000000000000000000000000",
      ),
    ).toBe("FTM");
  });

  it("uses tokenAddress when the token field is not the zero address", () => {
    expect(
      getDisplayTokenName("Native Gas Token", "Base", "0x0000000000000000000000000000000000000000"),
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

  it("preserves Cooler receivable labels", () => {
    expect(getDisplayTokenName("USDS - Borrowed Through Cooler Loans V2")).toBe(
      "Cooler Loan USDS Receivables",
    );
    expect(getDisplayTokenName("DAI - Borrowed Through Cooler Loans")).toBe(
      "Cooler Loan DAI Receivables",
    );
  });
});
