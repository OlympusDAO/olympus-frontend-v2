import { describe, expect, it } from "vitest";
import { arbitrum, base, mainnet } from "@/lib/chains";
import { getSafeFee } from "../safeFee";

describe("getSafeFee", () => {
  it("adds 25% on a route to an L2", () => {
    expect(getSafeFee(100n, arbitrum.id)).toEqual({ value: 125n, maxOverpay: 25n });
    expect(getSafeFee(100n, base.id)).toEqual({ value: 125n, maxOverpay: 25n });
  });

  it("adds 300% on a route into Ethereum, whose fees follow L1 gas", () => {
    expect(getSafeFee(100n, mainnet.id)).toEqual({ value: 400n, maxOverpay: 300n });
  });
});
