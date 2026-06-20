/**
 * Shard the OHM v1 migration merkle tree (`tree.json`) into small, address-prefixed
 * JSON files so the frontend can fetch only the shard relevant to a connected wallet
 * instead of downloading the full ~41 MB tree.
 *
 * The full tree is keyed by (checksummed) address; we lowercase every address and
 * bucket it by the first N hex characters (default 2 → 256 shards). Each shard maps
 * `lowercase address → { amount, proof }`. The on-chain `migrate(amount, proof, allocatedAmount)`
 * takes `allocatedAmount = amount` and `proof` straight from these files.
 *
 * Usage (Node 24+, runs TypeScript natively — no tsx/flag needed):
 *   node scripts/shard-merkle-tree.ts --in ~/Downloads/tree.json --out public/migration
 *   node scripts/shard-merkle-tree.ts --in ~/Downloads/tree.json --upload
 *
 * Flags:
 *   --in <path>          Path to tree.json (default: ./tree.json)
 *   --out <dir>          Output directory (default: ./.migration-out)
 *   --prefix-len <n>     Address prefix length in hex chars (default: 2 → 256 shards)
 *   --expect-root <0x..> Assert the tree's merkleRoot equals this value (optional)
 *   --upload             Upload shards to Vercel Blob (needs BLOB_READ_WRITE_TOKEN + @vercel/blob)
 *   --blob-prefix <p>    Blob path prefix when uploading (default: migration)
 */

import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";

type RawClaim = { amount: string; leaf?: string; proof: string[] };
type Tree = {
  format: string;
  chainId: number;
  snapshotBlock: string | number;
  merkleRoot: string;
  tokenDecimals: number;
  leafEncoding?: unknown;
  claims: Record<string, RawClaim>;
};
type OutClaim = { amount: string; proof: string[] };

function parseArgs(argv: string[]): Record<string, string | boolean> {
  const out: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) {
      out[key] = true;
    } else {
      out[key] = next;
      i++;
    }
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const inPath = (args.in as string) ?? "tree.json";
  const outDir = (args.out as string) ?? ".migration-out";
  const prefixLen = Number(args["prefix-len"] ?? 2);
  const expectRoot = args["expect-root"] as string | undefined;
  const upload = args.upload === true;
  const blobPrefix = (args["blob-prefix"] as string) ?? "migration";

  if (!existsSync(inPath)) {
    throw new Error(`Input tree not found at "${inPath}". Pass --in <path>.`);
  }

  console.log(`Reading ${inPath} ...`);
  const tree = JSON.parse(readFileSync(inPath, "utf8")) as Tree;

  if (!tree.format?.startsWith("ohm-v1-migrator")) {
    throw new Error(`Unexpected tree format: ${tree.format}`);
  }
  if (!tree.merkleRoot) throw new Error("Tree is missing merkleRoot");

  console.log(`  format:        ${tree.format}`);
  console.log(`  chainId:       ${tree.chainId}`);
  console.log(`  snapshotBlock: ${tree.snapshotBlock}`);
  console.log(`  tokenDecimals: ${tree.tokenDecimals}`);
  console.log(`  merkleRoot:    ${tree.merkleRoot}`);

  if (expectRoot && expectRoot.toLowerCase() !== tree.merkleRoot.toLowerCase()) {
    throw new Error(
      `merkleRoot mismatch: tree has ${tree.merkleRoot} but --expect-root was ${expectRoot}`,
    );
  }

  const entries = Object.entries(tree.claims);
  console.log(`  claims:        ${entries.length}`);

  // Bucket claims by lowercased-address prefix.
  const shards = new Map<string, Record<string, OutClaim>>();
  for (const [address, claim] of entries) {
    const lower = address.toLowerCase();
    const prefix = lower.slice(2, 2 + prefixLen);
    let shard = shards.get(prefix);
    if (!shard) {
      shard = {};
      shards.set(prefix, shard);
    }
    shard[lower] = { amount: claim.amount, proof: claim.proof };
  }

  // Reset output dir.
  if (existsSync(outDir)) rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });

  const manifest = {
    merkleRoot: tree.merkleRoot,
    snapshotBlock: tree.snapshotBlock,
    chainId: tree.chainId,
    tokenDecimals: tree.tokenDecimals,
    leafEncoding: tree.leafEncoding,
    count: entries.length,
    shardPrefixLength: prefixLen,
  };

  const files: { name: string; body: string }[] = [
    { name: "manifest.json", body: JSON.stringify(manifest, null, 2) },
  ];
  for (const [prefix, shard] of shards) {
    files.push({ name: `claims-${prefix}.json`, body: JSON.stringify(shard) });
  }

  for (const file of files) {
    writeFileSync(join(outDir, file.name), file.body);
  }
  console.log(`Wrote ${files.length} files (${shards.size} shards + manifest) to ${outDir}/`);

  if (upload) {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      throw new Error("--upload requires BLOB_READ_WRITE_TOKEN in the environment");
    }
    // Dynamic import so the script runs without @vercel/blob unless uploading.
    const { put } = await import("@vercel/blob");
    let baseUrl = "";
    for (const file of files) {
      const pathname = `${blobPrefix}/${file.name}`;
      const res = await put(pathname, file.body, {
        access: "public",
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: "application/json",
      });
      if (file.name === "manifest.json") {
        baseUrl = res.url.slice(0, res.url.lastIndexOf("/"));
      }
    }
    console.log(`Uploaded ${files.length} files to Vercel Blob.`);
    console.log(`Set VITE_MIGRATION_CLAIMS_BASE_URL=${baseUrl}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
