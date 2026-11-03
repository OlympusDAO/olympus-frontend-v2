import { describe, it, expect, beforeAll } from "vitest";
import { type Hex, recoverTypedDataAddress } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { getAuthorizationSignature } from "../getAuthorizationSignature";

const account = privateKeyToAccount(
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
);
const MONO_COOLER = "0xdb591Ea2e5Db886dA872654D58f6cc584b68e7cC";
const COMPOSITES = "0x6593768feBF9C95aC857Fb7Ef244D5738D1C57Fd";
const DEADLINE = 1_800_000_000n;

// Mirrors the typed data the contract verifies, so recovery checks don't depend on the helper.
const TYPES = {
  Authorization: [
    { name: "account", type: "address" },
    { name: "authorized", type: "address" },
    { name: "authorizationDeadline", type: "uint96" },
    { name: "nonce", type: "uint256" },
    { name: "signatureDeadline", type: "uint256" },
  ],
} as const;

/** Some wallets (Ledger, some WalletConnect wallets) return v as a 0/1 y-parity byte instead of 27/28. */
function toYParityFormat(sig: Hex): Hex {
  const v = parseInt(sig.slice(-2), 16);
  return `${sig.slice(0, -2)}${(v - 27).toString(16).padStart(2, "0")}` as Hex;
}

type SignTypedDataAsync = Parameters<typeof getAuthorizationSignature>[0]["signTypedDataAsync"];

async function sign(nonce: bigint, transform: (sig: Hex) => Hex) {
  let raw: Hex | undefined;
  // Test double for wagmi's signTypedDataAsync: signs with a local key, then reformats like a wallet would.
  const signTypedDataAsync = (async (args: Parameters<typeof account.signTypedData>[0]) => {
    raw = await account.signTypedData(args);
    return transform(raw);
  }) as unknown as SignTypedDataAsync;

  const result = await getAuthorizationSignature({
    userAddress: account.address,
    authorizedAddress: COMPOSITES,
    verifyingContract: MONO_COOLER,
    chainId: 1,
    deadline: DEADLINE,
    nonce,
    signTypedDataAsync,
  });
  return { ...result, raw: raw as Hex };
}

function recover(nonce: bigint, signature: { r: Hex; s: Hex; v: number }) {
  return recoverTypedDataAddress({
    domain: { chainId: 1, verifyingContract: MONO_COOLER },
    types: TYPES,
    primaryType: "Authorization",
    message: {
      account: account.address,
      authorized: COMPOSITES,
      authorizationDeadline: DEADLINE,
      nonce,
      signatureDeadline: DEADLINE,
    },
    signature: { ...signature, v: BigInt(signature.v) },
  });
}

describe("getAuthorizationSignature", () => {
  // Signing is deterministic, so find one nonce whose signature has v = 27 and one with v = 28.
  const nonceByV = new Map<number, bigint>();
  beforeAll(async () => {
    for (let n = 0n; nonceByV.size < 2 && n < 32n; n++) {
      const { raw } = await sign(n, (s) => s);
      const v = parseInt(raw.slice(-2), 16);
      if (!nonceByV.has(v)) nonceByV.set(v, n);
    }
  });

  for (const expectedV of [27, 28]) {
    describe(`when the signature's recovery value is ${expectedV}`, () => {
      for (const [format, transform] of [
        ["27/28", (s: Hex) => s],
        ["0/1 y-parity", toYParityFormat],
      ] as const) {
        it(`returns v = ${expectedV} for a ${format} signature and recovers the signer`, async () => {
          const nonce = nonceByV.get(expectedV);
          expect(nonce).toBeDefined();

          const { signature, raw } = await sign(nonce as bigint, transform);

          expect(signature.v).toBe(expectedV);
          expect(signature.r).toBe(raw.slice(0, 66));
          expect(signature.s).toBe(`0x${raw.slice(66, 130)}`);
          expect(await recover(nonce as bigint, signature)).toBe(account.address);
        });
      }
    });
  }
});
