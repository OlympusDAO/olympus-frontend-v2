/**
 * Prepare a local anvil mainnet-fork for OHM v1 migration testing.
 *
 * The migrator (0x5131...B8B0) is already deployed, active, enabled, and funded with
 * mint approval on mainnet — the ONLY thing unset is its merkleRoot. This script:
 *   1. Sets the migrator's `merkleRoot` to the test tree's root (via anvil_setStorageAt,
 *      auto-discovering the storage slot by write-readback — no admin role needed).
 *   2. Gives the dev account an OHM v1 balance (same slot-discovery trick on the token).
 *   3. Calls `verifyClaim` on-chain to confirm the dev claim is valid.
 *
 * Run an anvil fork first:
 *   anvil --fork-url $MAINNET_RPC_URL
 *
 * Then (after `node scripts/make-test-tree.ts`):
 *   node scripts/fork-setup.ts                       # uses .migration-out/test-tree.json, dev = anvil #0
 *   node scripts/fork-setup.ts --dev 0x7099...79C8   # different dev account
 *   node scripts/fork-setup.ts --balance 10000       # OHM v1 to grant the dev (default = allocation)
 */

import { readFileSync } from "node:fs";
import {
  createTestClient,
  http,
  publicActions,
  encodeAbiParameters,
  encodeFunctionData,
  keccak256,
  toHex,
  parseEther,
  parseUnits,
  type Address,
  type Hex,
} from "viem";
import { mainnet } from "viem/chains";

const OHM_DECIMALS = 9;
const MIGRATOR = "0x5131654eFCd63f7b797e00118792e0d0dD90B8B0" as Address;
const OHM_V1 = "0x383518188c0c6d7730d91b2c03a03c837814a899" as Address;
const SOHM_V1 = "0x04F2694C8fcee23e8Fd0dfEA1d4f5Bb8c352111F" as Address;
const WSOHM = "0xCa76543Cf381ebBB277bE79574059e32108e3E65" as Address;
// A current sOHM v1 holder to source test sOHM v1 from (impersonated on the fork).
const DEFAULT_SOHM_SOURCE = "0x0094b5b2FA371F32Db3017f6be194db5D182864F" as Address;
const SLOT_SCAN = 64;

const migratorAbi = [
  {
    inputs: [],
    name: "merkleRoot",
    outputs: [{ type: "bytes32" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "isEnabled",
    outputs: [{ type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "remainingMintApproval",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ type: "address" }, { type: "uint256" }, { type: "bytes32[]" }],
    name: "verifyClaim",
    outputs: [{ type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

const erc20Abi = [
  {
    inputs: [{ type: "address" }],
    name: "balanceOf",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ type: "address" }, { type: "uint256" }],
    name: "transfer",
    outputs: [{ type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

function parseArgs(argv: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith("--")) continue;
    out[argv[i].slice(2)] = argv[i + 1];
    i++;
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
const rpc = args.rpc ?? "http://localhost:8545";
const treePath = args.tree ?? ".migration-out/test-tree.json";

const client = createTestClient({ mode: "anvil", chain: mainnet, transport: http(rpc) }).extend(
  publicActions,
);

async function setStorage(address: Address, slot: Hex, value: Hex) {
  await client.request({
    method: "anvil_setStorageAt" as never,
    params: [address, slot, value] as never,
  });
}

async function getStorage(address: Address, slot: Hex): Promise<Hex> {
  const v = await client.getStorageAt({ address, slot });
  return (v ?? `0x${"0".repeat(64)}`) as Hex;
}

/** Find the storage slot that backs a value and set it, restoring on miss. */
async function discoverAndSet(
  label: string,
  address: Address,
  slotFor: (i: number) => Hex,
  value: Hex,
  read: () => Promise<unknown>,
  matches: (read: unknown) => boolean,
): Promise<number> {
  for (let i = 0; i < SLOT_SCAN; i++) {
    const slot = slotFor(i);
    const original = await getStorage(address, slot);
    await setStorage(address, slot, value);
    if (matches(await read())) {
      console.log(`  ${label}: slot ${i} ✓`);
      return i;
    }
    await setStorage(address, slot, original);
  }
  throw new Error(`Could not locate storage slot for ${label} within ${SLOT_SCAN} slots`);
}

async function main() {
  const chainId = await client.getChainId();
  if (chainId !== 1) throw new Error(`Expected chainId 1 (mainnet fork), got ${chainId}`);
  const code = await client.getCode({ address: MIGRATOR });
  if (!code || code === "0x")
    throw new Error(`No migrator code at ${MIGRATOR} — is this a mainnet fork?`);

  const tree = JSON.parse(readFileSync(treePath, "utf8")) as {
    merkleRoot: Hex;
    claims: Record<string, { amount: string; proof: Hex[] }>;
  };
  const root = tree.merkleRoot;

  const devArg = (args.dev ?? Object.keys(tree.claims)[0]).toLowerCase();
  const entry = Object.entries(tree.claims).find(([a]) => a.toLowerCase() === devArg);
  if (!entry) throw new Error(`Dev address ${devArg} not found in ${treePath}`);
  const dev = entry[0] as Address;
  const allocated = BigInt(entry[1].amount);
  const proof = entry[1].proof;
  const balance = args.balance ? parseUnits(args.balance, OHM_DECIMALS) : allocated;

  console.log(`Fork: ${rpc}`);
  console.log(`Dev:  ${dev}`);
  console.log(`Root: ${root}`);
  console.log("");

  // 1. Set the migrator merkle root.
  await discoverAndSet(
    "merkleRoot",
    MIGRATOR,
    (i) => toHex(i, { size: 32 }),
    root,
    () => client.readContract({ address: MIGRATOR, abi: migratorAbi, functionName: "merkleRoot" }),
    (r) => (r as string).toLowerCase() === root.toLowerCase(),
  );

  // 2. Fund the dev account with OHM v1 (balanceOf slot = keccak(abi.encode(dev, slot))).
  const balanceValue = toHex(balance, { size: 32 });
  await discoverAndSet(
    "OHM v1 balanceOf",
    OHM_V1,
    (i) =>
      keccak256(encodeAbiParameters([{ type: "address" }, { type: "uint256" }], [dev, BigInt(i)])),
    balanceValue,
    () =>
      client.readContract({
        address: OHM_V1,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [dev],
      }),
    (b) => b === balance,
  );

  // 3. Source sOHM v1 to the dev account (best-effort) so the unstake flow can be tested
  //    through the UI. Requires an archive-capable fork RPC (sOHM v1 uses gons storage);
  //    skip with `--sohm 0`. Done by impersonating a current holder and transferring.
  const sohmAmount = args.sohm
    ? parseUnits(args.sohm, OHM_DECIMALS)
    : parseUnits("50", OHM_DECIMALS);
  if (sohmAmount > 0n) {
    const source = (args["sohm-source"] as Address) ?? DEFAULT_SOHM_SOURCE;
    try {
      const sourceBal = (await client.readContract({
        address: SOHM_V1,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [source],
      })) as bigint;
      if (sourceBal < sohmAmount) {
        throw new Error(`source ${source} only holds ${Number(sourceBal) / 1e9} sOHM v1`);
      }
      await client.request({
        method: "anvil_impersonateAccount" as never,
        params: [source] as never,
      });
      await client.request({
        method: "anvil_setBalance" as never,
        params: [source, toHex(parseEther("1"))] as never,
      });
      const txHash = (await client.request({
        method: "eth_sendTransaction" as never,
        params: [
          {
            from: source,
            to: SOHM_V1,
            data: encodeFunctionData({
              abi: erc20Abi,
              functionName: "transfer",
              args: [dev, sohmAmount],
            }),
          },
        ] as never,
      })) as Hex;
      await client.waitForTransactionReceipt({ hash: txHash });
      await client.request({
        method: "anvil_stopImpersonatingAccount" as never,
        params: [source] as never,
      });
      console.log(`  sOHM v1: sent ${Number(sohmAmount) / 1e9} from ${source} ✓`);
    } catch (e) {
      console.log(
        `  sOHM v1: skipped (${(e as Error).message}). Use an archive RPC (e.g. drpc.org) to test unstaking.`,
      );
    }
  }

  // 3b. Fund the dev account with wsOHM (standard ERC20 balance slot, like OHM v1) so the
  //     unwrap flow can be tested. Kept small so unwrapping stays within the wsOHM contract's
  //     sOHM backing. Skip with `--wsohm 0`. (Unwrapping itself still needs an archive fork.)
  const wsohmAmount = args.wsohm ? parseUnits(args.wsohm, 18) : parseUnits("5", 18);
  if (wsohmAmount > 0n) {
    try {
      await discoverAndSet(
        "wsOHM balanceOf",
        WSOHM,
        (i) =>
          keccak256(
            encodeAbiParameters([{ type: "address" }, { type: "uint256" }], [dev, BigInt(i)]),
          ),
        toHex(wsohmAmount, { size: 32 }),
        () =>
          client.readContract({
            address: WSOHM,
            abi: erc20Abi,
            functionName: "balanceOf",
            args: [dev],
          }),
        (b) => b === wsohmAmount,
      );
    } catch (e) {
      console.log(`  wsOHM: skipped (${(e as Error).message}).`);
    }
  }

  // 4. Verify on-chain.
  const [isEnabled, remainingMintApproval, claimValid, ohmV1Bal, sohmV1Bal, wsohmBal] =
    await Promise.all([
      client.readContract({ address: MIGRATOR, abi: migratorAbi, functionName: "isEnabled" }),
      client.readContract({
        address: MIGRATOR,
        abi: migratorAbi,
        functionName: "remainingMintApproval",
      }),
      client.readContract({
        address: MIGRATOR,
        abi: migratorAbi,
        functionName: "verifyClaim",
        args: [dev, allocated, proof],
      }),
      client.readContract({
        address: OHM_V1,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [dev],
      }),
      client.readContract({
        address: SOHM_V1,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [dev],
      }),
      client.readContract({
        address: WSOHM,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [dev],
      }),
    ]);

  const human = (v: bigint) => Number(v) / 10 ** OHM_DECIMALS;
  console.log("");
  console.log("On-chain state:");
  console.log(`  isEnabled:             ${isEnabled}`);
  console.log(`  remainingMintApproval: ${human(remainingMintApproval as bigint)} OHM`);
  console.log(`  dev OHM v1 balance:    ${human(ohmV1Bal as bigint)} OHM v1`);
  console.log(`  dev sOHM v1 balance:   ${human(sohmV1Bal as bigint)} sOHM v1`);
  console.log(`  dev wsOHM balance:     ${Number(wsohmBal as bigint) / 1e18} wsOHM`);
  console.log(`  dev allocation:        ${human(allocated)} OHM v1`);
  console.log(`  verifyClaim(dev):      ${claimValid}`);
  console.log("");
  if (!isEnabled || !claimValid) {
    throw new Error("Fork not ready: migrator disabled or claim invalid.");
  }
  console.log("✅ Fork ready. Start the frontend with VITE_MAINNET_RPC_URL=" + rpc);
  console.log("   Import the dev account into your wallet (anvil #0 pk: 0xac09...ff80),");
  console.log("   add a network with RPC " + rpc + " and chainId 1, then migrate.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
