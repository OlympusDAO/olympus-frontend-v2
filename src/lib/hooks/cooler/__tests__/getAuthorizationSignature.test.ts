import { describe, it, expect } from "vitest";
import { type Hex, encodeAbiParameters } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { getAuthorizationSignature } from "../getAuthorizationSignature";

const account = privateKeyToAccount(
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
);
const MONO_COOLER = "0xdb591Ea2e5Db886dA872654D58f6cc584b68e7cC";
const COMPOSITES = "0x6593768feBF9C95aC857Fb7Ef244D5738D1C57Fd";

/** Some wallets (Ledger, some WalletConnect wallets) return v as a 0/1 y-parity byte instead of 27/28. */
function toYParityFormat(sig: Hex): Hex {
  const v = parseInt(sig.slice(-2), 16);
  return `${sig.slice(0, -2)}${(v - 27).toString(16).padStart(2, "0")}` as Hex;
}

async function sign(transform: (sig: Hex) => Hex) {
  return getAuthorizationSignature({
    userAddress: account.address,
    authorizedAddress: COMPOSITES,
    verifyingContract: MONO_COOLER,
    chainId: 1,
    deadline: 1_800_000_000n,
    nonce: 9n,
    // biome-ignore lint/suspicious/noExplicitAny: test double for wagmi's signTypedDataAsync
    signTypedDataAsync: (async (args: any) => transform(await account.signTypedData(args))) as any,
  });
}

describe("getAuthorizationSignature", () => {
  it("returns v as 27/28 when the wallet returns a legacy 27/28 signature", async () => {
    const { signature } = await sign((s) => s);
    expect([27, 28]).toContain(signature.v);
  });

  it("normalizes a 0/1 y-parity signature to v = 27/28", async () => {
    const legacy = await sign((s) => s);
    const yParity = await sign(toYParityFormat);

    expect(yParity.signature).toEqual(legacy.signature);
    // The contract call encodes v as uint8; NaN here meant the write threw before reaching the wallet.
    expect(() => encodeAbiParameters([{ type: "uint8" }], [yParity.signature.v])).not.toThrow();
  });
});
