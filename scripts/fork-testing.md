# OHM v1 → v2 Migration — Local Fork Testing

Test the full migrate flow (Approve → Migrate) through the real frontend against a local
anvil mainnet fork. The migrator (`0x5131…B8B0`) is already deployed, active, enabled, and
funded with mint approval on mainnet — only its `merkleRoot` is unset, so all we do on the
fork is set a **test** root and fund a dev account we control.

Requires: Foundry (`anvil`, `cast`), Node ≥ 24, pnpm.

## 1. Start an anvil mainnet fork

```bash
anvil --fork-url $MAINNET_RPC_URL    # e.g. https://ethereum-rpc.publicnode.com
```

Leave it running. It serves chainId 1 at `http://localhost:8545` with 10 pre-funded dev
accounts (account #0 = `0xf39Fd6…92266`, pk `0xac09…ff80`).

> **Archive RPC note:** to test the **sOHM v1 unstake** or **wsOHM unwrap** flows, fork from
> an **archive-capable** RPC (e.g. `https://eth.drpc.org` or `https://1rpc.io/eth`). Those
> legacy tokens use gons-based storage that needs archive state; non-archive nodes (publicnode)
> return 403 on it. The plain OHM v1 → v2 migrate flow works on any fork.

## 2. Generate a test tree (includes the dev account)

```bash
node scripts/make-test-tree.ts --amount 5000
```

Builds a merkle tree giving anvil account #0 a 5000 OHM v1 allocation, writes it to
`.migration-out/test-tree.json`, and shards it into `public/migration/` (the frontend's
dev fallback serves these directly). Prints the root.

## 3. Configure the fork (set root + fund dev OHM v1)

```bash
node scripts/fork-setup.ts
```

Sets the migrator's `merkleRoot` to the test root and gives the dev account 5000 OHM v1
(both via `anvil_setStorageAt`, auto-discovering the slots — no admin role needed), then
asserts `verifyClaim(dev)` is true on-chain. It also gives the dev **50 sOHM v1** (by impersonating a current holder; needs an archive
fork) and **5 wsOHM** (via `setStorageAt`) so the unstake and unwrap flows are testable.
Flags: `--dev <addr>`, `--balance <ohm>`, `--sohm <amt>` (0 to skip), `--wsohm <amt>` (0 to skip).

### Conversion chain (legacy tokens → OHM v1 → migrate)

The migrator only accepts **OHM v1**, so legacy holders convert first. Each Balances-page row
has its own action:

- **wsOHM** → **Unwrap** → sOHM v1 (single tx, no approval; not 1:1 — scaled by the gOHM index)
- **sOHM v1** → **Unstake** → OHM v1 (approve + unstake, 1:1)
- **OHM v1** → **Migrate** → OHM v2

> wsOHM only yields a migratable claim once the snapshot/`tree.json` credits the **underlying
> holder** (not the wsOHM contract). Regenerate the tree in `ohm-v1-balances` accordingly.

## 4. Run the frontend against the fork

```bash
VITE_MAINNET_RPC_URL=http://localhost:8545 pnpm dev
```

(Or add `VITE_MAINNET_RPC_URL=http://localhost:8545` to `.env`.)

## 5. Connect a wallet and migrate

- Import anvil account #0 into MetaMask/Rainbow (pk `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`).
- Add/select a network: RPC `http://localhost:8545`, **chainId 1**, symbol ETH.
- Open the app → **My Balances**. The OHM v1 row shows a **Migrate** button.
- Migrate a partial amount, confirm OHM v1 drops and OHM v2 rises, then migrate the rest;
  the button flips to **Migrated** once the allocation is exhausted.

## Notes

- `previewMigrate` returns ~1:1 but can round down 1 wei (OHM v1 → gOHM → OHM v2); the UI
  shows the previewed amount, not the input.
- Each fork run is a clean slate. Re-run steps 1–3 to reset migrated amounts.
- Production uses the real `tree.json` sharded to Vercel Blob via `pnpm shard:migration --upload`
  with `VITE_MIGRATION_CLAIMS_BASE_URL` pointing at the Blob base — see the main plan.
- The migrator's real mainnet `merkleRoot` is still `0x0`; it must be set on mainnet (by an
  address with the `legacy_migration_admin`/admin role) before production migration works.
