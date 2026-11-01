import { describe, expect, it } from "vitest";
import { classifyCcipStatus, classifyLayerZeroStatus } from "../bridgeStatus";

describe("classifyCcipStatus", () => {
  const message = (status: string, readyForManualExecution = false) => ({
    status,
    readyForManualExecution,
  });

  it("is delivered when CCIP succeeded and the bridge stored no failure", () => {
    expect(classifyCcipStatus(message("SUCCESS"), false)).toBe("DELIVERED");
  });

  it("needs a retry when CCIP succeeded but the bridge stored a failure", () => {
    expect(classifyCcipStatus(message("SUCCESS"), true)).toBe("NEEDS_RETRY");
  });

  it("needs recovery when CCIP failed", () => {
    expect(classifyCcipStatus(message("FAILED"))).toBe("NEEDS_RECOVERY");
  });

  it("needs recovery when ready for manual execution", () => {
    expect(classifyCcipStatus(message("BLESSED", true))).toBe("NEEDS_RECOVERY");
  });

  it.each([
    "SENT",
    "SOURCE_FINALIZED",
    "COMMITTED",
    "BLESSED",
    "VERIFYING",
    "SOMETHING_NEW",
  ])("treats %s as in flight", (status) => {
    expect(classifyCcipStatus(message(status))).toBe("INFLIGHT");
  });
});

describe("classifyLayerZeroStatus", () => {
  it.each([
    ["DELIVERED", "DELIVERED"],
    ["INFLIGHT", "INFLIGHT"],
    ["CONFIRMING", "INFLIGHT"],
    ["FAILED", "FAILED"],
    ["BLOCKED", "FAILED"],
  ])("maps %s to %s", (input, expected) => {
    expect(classifyLayerZeroStatus(input)).toBe(expected);
  });
});
