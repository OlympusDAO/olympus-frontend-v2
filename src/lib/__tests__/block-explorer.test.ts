import { describe, expect, it, vi } from "vitest";
import { BRIDGE_CHAINS } from "@/modules/ohm/utils/constants";
import { getBlockExplorerTxUrl } from "../helpers";

vi.mock("@/lib/wagmi-config", () => ({
  config: { getClient: () => ({ chain: { blockExplorers: { default: { url: "" } } } }) },
}));

describe("getBlockExplorerTxUrl", () => {
  it.each(
    BRIDGE_CHAINS.map((c) => [c.name, c.chainId] as const),
  )("has a real link on %s", (_name, chainId) => {
    expect(getBlockExplorerTxUrl(chainId, "0xabc")).toMatch(/^https:\/\/.+\/tx\/0xabc$/);
  });
});
