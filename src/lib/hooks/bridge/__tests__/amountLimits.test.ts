import { describe, expect, it } from "vitest";
import { parseUnits } from "viem";
import { evaluateAmount } from "../amountLimits";

const ohm = (n: string) => parseUnits(n, 9);

describe("evaluateAmount", () => {
  it("blocks an amount over the outbound bucket", () => {
    expect(
      evaluateAmount({
        amount: ohm("50001"),
        outboundTokens: ohm("50000"),
        inboundTokens: ohm("110000"),
      }).status,
    ).toBe("exceeds-route-limit");
  });

  it("blocks an amount over the inbound bucket", () => {
    expect(
      evaluateAmount({
        amount: ohm("55001"),
        outboundTokens: ohm("100000"),
        inboundTokens: ohm("55000"),
      }).status,
    ).toBe("exceeds-route-limit");
  });

  it("blocks an amount over pool liquidity going into mainnet", () => {
    expect(
      evaluateAmount({
        amount: ohm("40000"),
        outboundTokens: ohm("50000"),
        inboundTokens: ohm("55000"),
        poolLiquidity: ohm("30000"),
      }).status,
    ).toBe("exceeds-liquidity");
  });

  it("ignores liquidity when none is given, as for L2 destinations", () => {
    expect(
      evaluateAmount({
        amount: ohm("40000"),
        outboundTokens: ohm("100000"),
        inboundTokens: ohm("110000"),
      }).status,
    ).toBe("ok");
  });

  it("warns above 90% of the tightest limit", () => {
    expect(
      evaluateAmount({ amount: ohm("91"), outboundTokens: ohm("100"), inboundTokens: ohm("1000") })
        .status,
    ).toBe("near-limit");
  });

  it("warns on liquidity as the tightest limit", () => {
    expect(
      evaluateAmount({
        amount: ohm("91"),
        outboundTokens: ohm("1000"),
        inboundTokens: ohm("1000"),
        poolLiquidity: ohm("100"),
      }).status,
    ).toBe("near-limit");
  });

  it("does not warn at exactly 90%", () => {
    expect(
      evaluateAmount({ amount: ohm("90"), outboundTokens: ohm("100"), inboundTokens: ohm("1000") })
        .status,
    ).toBe("ok");
  });

  it("is ok for a zero amount", () => {
    expect(evaluateAmount({ amount: 0n }).status).toBe("ok");
  });

  it("does not call a missing bucket ok to send", () => {
    expect(evaluateAmount({ amount: ohm("1"), inboundTokens: ohm("100") }).status).toBe(
      "exceeds-route-limit",
    );
  });

  it("treats a rate limiter switched off on the pool as no limit", () => {
    expect(
      evaluateAmount({ amount: ohm("1000"), outboundTokens: null, inboundTokens: ohm("100000") })
        .status,
    ).toBe("ok");
  });
});
