/**
 * Generate a SMALL test merkle tree for local fork testing of the OHM v1 migration.
 *
 * Unlike the production `tree.json` (29k real holders whose keys you don't control),
 * this builds a tree that includes anvil's default dev accounts — whose private keys
 * are public — so you can sign `approve` + `migrate` through the real frontend.
 *
 * It uses OpenZeppelin's StandardMerkleTree over `["address","uint256"]`, which produces
 * exactly the leaf hashing the contract verifies:
 *   keccak256(bytes.concat(keccak256(abi.encode(address, uint256))))
 *
 * Output:
 *   - .migration-out/test-tree.json   (full tree in the `ohm-v1-migrator/v1` format)
 *   - public/migration/claims-<xx>.json + manifest.json  (sharded for the frontend)
 * and prints the root + the dev account/allocation to feed into `fork-setup.ts`.
 *
 * Usage (Node 24+):
 *   node scripts/make-test-tree.ts
 *   node scripts/make-test-tree.ts --amount 5000   # OHM v1 allocation for the primary dev account
 */

import { StandardMerkleTree } from "@openzeppelin/merkle-tree";
import { parseUnits } from "viem";
import { mkdirSync, rmSync, existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const OHM_DECIMALS = 9;

// anvil's default mnemonic accounts (public keys + known private keys).
const DEV_ACCOUNTS = [
  "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", // #0 — primary; pk 0xac09...ff80
  "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", // #1
  "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", // #2
];

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
const primaryAmount = parseUnits(args.amount ?? "5000", OHM_DECIMALS);
const fillerAmount = parseUnits("100", OHM_DECIMALS);

// Primary dev account gets the configurable allocation; the others are filler
// so the tree has real depth (non-trivial proofs).
const entries = DEV_ACCOUNTS.map((address, i) => ({
  address,
  amount: i === 0 ? primaryAmount : fillerAmount,
}));

const tree = StandardMerkleTree.of(
  entries.map((e) => [e.address, e.amount.toString()]),
  ["address", "uint256"],
);

const claims: Record<string, { amount: string; leaf: string; proof: string[] }> = {};
for (const [i, value] of tree.entries()) {
  const [address, amount] = value;
  claims[address] = { amount, leaf: tree.leafHash(value), proof: tree.getProof(i) };
}

const fullTree = {
  format: "ohm-v1-migrator/v1",
  chainId: 1,
  snapshotBlock: "0",
  merkleRoot: tree.root,
  tokenDecimals: OHM_DECIMALS,
  leafEncoding: "keccak256(bytes.concat(keccak256(abi.encode(address,uint256))))",
  claims,
};

// Write the full tree.
mkdirSync(".migration-out", { recursive: true });
const treePath = join(".migration-out", "test-tree.json");
writeFileSync(treePath, JSON.stringify(fullTree, null, 2));

// Shard into public/migration so the frontend (dev fallback) serves it directly.
const outDir = join("public", "migration");
if (existsSync(outDir)) rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const shards = new Map<string, Record<string, { amount: string; proof: string[] }>>();
for (const [address, claim] of Object.entries(claims)) {
  const lower = address.toLowerCase();
  const prefix = lower.slice(2, 4);
  const shard = shards.get(prefix) ?? {};
  shard[lower] = { amount: claim.amount, proof: claim.proof };
  shards.set(prefix, shard);
}
for (const [prefix, shard] of shards) {
  writeFileSync(join(outDir, `claims-${prefix}.json`), JSON.stringify(shard));
}
writeFileSync(
  join(outDir, "manifest.json"),
  JSON.stringify(
    {
      merkleRoot: tree.root,
      chainId: 1,
      tokenDecimals: OHM_DECIMALS,
      count: entries.length,
      shardPrefixLength: 2,
      testTree: true,
    },
    null,
    2,
  ),
);

const human = (v: bigint) => Number(v) / 10 ** OHM_DECIMALS;

console.log("Test merkle tree generated.");
console.log(`  tree file:  ${treePath}`);
console.log(`  shards:     ${outDir}/ (${shards.size} files)`);
console.log(`  merkleRoot: ${tree.root}`);
console.log("");
console.log("  Dev claims:");
for (const e of entries) {
  console.log(`    ${e.address}  ${human(e.amount)} OHM v1`);
}
console.log("");
console.log("Next: set this root + fund the dev account on your anvil fork:");
console.log(
  `  node scripts/fork-setup.ts --root ${tree.root} --dev ${entries[0].address} --amount ${entries[0].amount}`,
);
