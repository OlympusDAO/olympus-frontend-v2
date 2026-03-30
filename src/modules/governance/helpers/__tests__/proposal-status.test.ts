import { describe, it, expect } from "vitest";
import {
  PROPOSAL_STATUS_MAP,
  getStatusColor,
  toCapitalCase,
  getDateFromBlock,
} from "@/modules/governance/helpers/proposal-status";

describe("PROPOSAL_STATUS_MAP", () => {
  it("maps all 10 numeric values to their status strings", () => {
    expect(PROPOSAL_STATUS_MAP[0]).toBe("Pending");
    expect(PROPOSAL_STATUS_MAP[1]).toBe("Active");
    expect(PROPOSAL_STATUS_MAP[2]).toBe("Canceled");
    expect(PROPOSAL_STATUS_MAP[3]).toBe("Defeated");
    expect(PROPOSAL_STATUS_MAP[4]).toBe("Succeeded");
    expect(PROPOSAL_STATUS_MAP[5]).toBe("Queued");
    expect(PROPOSAL_STATUS_MAP[6]).toBe("Expired");
    expect(PROPOSAL_STATUS_MAP[7]).toBe("Executed");
    expect(PROPOSAL_STATUS_MAP[8]).toBe("Vetoed");
    expect(PROPOSAL_STATUS_MAP[9]).toBe("Emergency");
  });

  it("covers exactly 10 entries", () => {
    expect(Object.keys(PROPOSAL_STATUS_MAP)).toHaveLength(10);
  });
});

describe("getStatusColor", () => {
  it("returns green for Active", () => {
    expect(getStatusColor("Active")).toBe("green");
  });

  it("returns green for Succeeded", () => {
    expect(getStatusColor("Succeeded")).toBe("green");
  });

  it("returns yellow for Queued", () => {
    expect(getStatusColor("Queued")).toBe("yellow");
  });

  it("returns yellow for Pending", () => {
    expect(getStatusColor("Pending")).toBe("yellow");
  });

  it("returns blue for Executed", () => {
    expect(getStatusColor("Executed")).toBe("blue");
  });

  it("returns blue for Emergency", () => {
    expect(getStatusColor("Emergency")).toBe("blue");
  });

  it("returns red for Defeated", () => {
    expect(getStatusColor("Defeated")).toBe("red");
  });

  it("returns red for Vetoed", () => {
    expect(getStatusColor("Vetoed")).toBe("red");
  });

  it("returns red for Canceled", () => {
    expect(getStatusColor("Canceled")).toBe("red");
  });

  it("returns gray for Expired", () => {
    expect(getStatusColor("Expired")).toBe("gray");
  });
});

describe("toCapitalCase", () => {
  it("capitalizes a lowercase word", () => {
    expect(toCapitalCase("active")).toBe("Active");
  });

  it("leaves an already-uppercase word unchanged (only first char is touched)", () => {
    // charAt(0).toUpperCase() + slice(1) → "P" + "ENDING" = "PENDING"
    expect(toCapitalCase("PENDING")).toBe("PENDING");
  });

  it("handles a mixed-case word", () => {
    expect(toCapitalCase("defeated")).toBe("Defeated");
  });

  it("handles a single character", () => {
    expect(toCapitalCase("a")).toBe("A");
  });

  it("returns empty string unchanged", () => {
    expect(toCapitalCase("")).toBe("");
  });
});

describe("getDateFromBlock", () => {
  it("returns a date in the future when target block is ahead of current block", () => {
    const currentBlock = 1000;
    const currentTimestamp = 1700000000; // unix seconds
    const targetBlock = 1100; // 100 blocks ahead

    const result = getDateFromBlock(targetBlock, currentBlock, currentTimestamp);

    // 100 blocks * 12 seconds/block = 1200 seconds ahead
    const expectedMs = (currentTimestamp + 12 * (targetBlock - currentBlock)) * 1000;
    expect(result.getTime()).toBe(expectedMs);
  });

  it("returns a date in the past when target block is behind current block", () => {
    const currentBlock = 1000;
    const currentTimestamp = 1700000000;
    const targetBlock = 900; // 100 blocks behind

    const result = getDateFromBlock(targetBlock, currentBlock, currentTimestamp);

    const expectedMs = (currentTimestamp + 12 * (targetBlock - currentBlock)) * 1000;
    expect(result.getTime()).toBe(expectedMs);
  });

  it("returns exactly the current time when target block equals current block", () => {
    const currentBlock = 1000;
    const currentTimestamp = 1700000000;

    const result = getDateFromBlock(currentBlock, currentBlock, currentTimestamp);

    expect(result.getTime()).toBe(currentTimestamp * 1000);
  });

  it("uses 12-second average block time for the calculation", () => {
    const currentBlock = 0;
    const currentTimestamp = 0;
    const targetBlock = 1;

    const result = getDateFromBlock(targetBlock, currentBlock, currentTimestamp);

    // 1 block * 12s = 12 seconds ahead = 12000 ms
    expect(result.getTime()).toBe(12000);
  });
});
