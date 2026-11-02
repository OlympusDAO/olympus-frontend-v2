import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchLayerZeroMessages } from "../useLayerZeroHistory";

const WALLET = "0x1234567890abcdef1234567890abcdef12345679";

function respond(status: number, body: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ ok: status < 400, status, json: async () => body }),
  );
}

afterEach(() => vi.unstubAllGlobals());

describe("fetchLayerZeroMessages", () => {
  it("treats Scan's no-message 404 as empty history", async () => {
    respond(404, { message: `Message not found for srcAddress ${WALLET}!`, code: 4040 });
    await expect(fetchLayerZeroMessages(WALLET)).resolves.toEqual([]);
  });

  it("still fails on any other 404", async () => {
    respond(404, { message: "Not found", code: 404 });
    await expect(fetchLayerZeroMessages(WALLET)).rejects.toThrow("404");
  });

  it("still fails on a 404 with no JSON body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => {
          throw new Error("not json");
        },
      }),
    );
    await expect(fetchLayerZeroMessages(WALLET)).rejects.toThrow("404");
  });

  it("still fails on a server error", async () => {
    respond(500, {});
    await expect(fetchLayerZeroMessages(WALLET)).rejects.toThrow("500");
  });

  it("returns the messages on success", async () => {
    respond(200, { data: [{ guid: "a" }] });
    await expect(fetchLayerZeroMessages(WALLET)).resolves.toEqual([{ guid: "a" }]);
  });

  it("is empty when a success has no data", async () => {
    respond(200, {});
    await expect(fetchLayerZeroMessages(WALLET)).resolves.toEqual([]);
  });
});
