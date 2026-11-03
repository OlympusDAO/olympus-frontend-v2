import { describe, expect, it } from "vitest";
import {
  ContractFunctionExecutionError,
  ContractFunctionRevertedError,
  HttpRequestError,
  parseAbi,
} from "viem";
import { classifyWallet, isThresholdAbsent } from "../walletKind";

const SAFE_CODE = "0x608060405273";

describe("classifyWallet", () => {
  it("treats the Safe App connector as a Safe, whatever the reads say", () => {
    expect(classifyWallet({ connectorId: "safe", codeKnown: false, threshold: "unknown" })).toBe(
      "safe",
    );
  });

  it("treats code with a threshold as a Safe, as over WalletConnect", () => {
    expect(classifyWallet({ code: SAFE_CODE, codeKnown: true, threshold: "found" })).toBe("safe");
  });

  it("treats no code as an EOA", () => {
    expect(classifyWallet({ codeKnown: true, threshold: "unknown" })).toBe("eoa");
    expect(classifyWallet({ code: "0x", codeKnown: true, threshold: "unknown" })).toBe("eoa");
  });

  it("treats an EIP-7702 delegated EOA as an EOA", () => {
    expect(
      classifyWallet({ code: `0xef0100${"a".repeat(40)}`, codeKnown: true, threshold: "unknown" }),
    ).toBe("eoa");
  });

  it("treats code that really has no threshold as a generic contract wallet", () => {
    expect(classifyWallet({ code: SAFE_CODE, codeKnown: true, threshold: "absent" })).toBe(
      "contract",
    );
  });

  it("is unknown while the code hasn't been read, not an EOA", () => {
    expect(classifyWallet({ codeKnown: false, threshold: "unknown" })).toBe("unknown");
  });

  it("is unknown while the threshold hasn't been read, not a contract wallet", () => {
    expect(classifyWallet({ code: SAFE_CODE, codeKnown: true, threshold: "unknown" })).toBe(
      "unknown",
    );
  });
});

describe("isThresholdAbsent", () => {
  const abi = parseAbi(["function getThreshold() view returns (uint256)"]);
  const wrap = (cause: Error) =>
    new ContractFunctionExecutionError(cause as never, {
      abi,
      functionName: "getThreshold",
    });

  it("is true when the contract reverted", () => {
    expect(
      isThresholdAbsent(
        wrap(new ContractFunctionRevertedError({ abi, functionName: "getThreshold" })),
      ),
    ).toBe(true);
  });

  it("is false on a transport failure, which says nothing about the wallet", () => {
    expect(isThresholdAbsent(wrap(new HttpRequestError({ url: "https://rpc" })))).toBe(false);
    expect(isThresholdAbsent(new Error("network"))).toBe(false);
  });
});
