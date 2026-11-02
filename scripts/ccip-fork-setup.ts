/**
 * Bring local anvil forks to the state the CCIP bridge will be in after activation, so the bridge
 * flow can be tested before OCG proposal 19 executes.
 *
 *   - Mainnet: replays proposal 19's real targets and calldatas from the OCG timelock.
 *   - L2s: runs the runbook's finalize steps from the local admins (pool enable, registry setPool).
 *   - Every chain: sets trusted remotes and gas limits on the bridge, then enables it.
 *   - Gives a dev wallet OHM on each fork.
 *
 * Start one fork per chain first, for example:
 *   anvil --fork-url $MAINNET_RPC_URL --port 8545
 *   anvil --fork-url $ARBITRUM_RPC_URL --port 8546
 *   anvil --fork-url $BASE_RPC_URL --port 8547
 *
 * Then:
 *   node scripts/ccip-fork-setup.ts --chains mainnet,arbitrum,base
 *   node scripts/ccip-fork-setup.ts --wallet 0x... --balance 5000
 *
 * Ports default to 8545 upward in the order given. Override with --rpc name=url,name=url.
 * See scripts/fork-testing.md.
 */

import {
  createPublicClient,
  encodeAbiParameters,
  encodeFunctionData,
  erc20Abi,
  http,
  keccak256,
  parseAbi,
  parseUnits,
  toHex,
  type Address,
  type Hex,
  type PublicClient,
} from "viem";

const INDEXER = "https://protocol-indexer-api.olympusdao.finance";
const GOVERNOR: Address = "0x0941233c964e7d7Efeb05D253176E5E634cEFfcD";
const PROPOSAL_ID = "19";
const GAS_LIMIT = 275_000;
const ANVIL_ACCOUNT_0: Address = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

type ChainName = "mainnet" | "arbitrum" | "base" | "berachain" | "optimism" | "robinhood";

type ChainConfig = {
  selector: bigint;
  bridge: Address;
  pool: Address;
  registry: Address;
  ohm: Address;
  routes: ChainName[];
};

// From olympus-v3 src/scripts/env.json. Keep in step with src/lib/contracts.ts.
const CHAINS: Record<ChainName, ChainConfig> = {
  mainnet: {
    selector: 5009297550715157269n,
    bridge: "0xFbf6383dC3F6010d403Ecdf12DDC1311701D143D",
    pool: "0xa5588e518CE5ee0e4628C005E4edAbD5e87de3aD",
    registry: "0xb22764f98dD05c789929716D677382Df22C05Cb6",
    ohm: "0x64aa3364F17a4D01c6f1751Fd97C2BD3D7e7f1D5",
    routes: ["arbitrum", "base", "berachain", "optimism", "robinhood"],
  },
  arbitrum: {
    selector: 4949039107694359620n,
    bridge: "0xb4f620c39F3BA4a1E7aD264fEd6239B0C618DB50",
    pool: "0xF35193DA8C10e44aF10853Ba5a3a1a6F7529E39a",
    registry: "0x39AE1032cF4B334a1Ed41cdD0833bdD7c7E7751E",
    ohm: "0xf0cb2dc0db5e6c66B9a70Ac27B06b878da017028",
    routes: ["mainnet", "base", "berachain", "optimism", "robinhood"],
  },
  base: {
    selector: 15971525489660198786n,
    bridge: "0xEBDe552D851DD6Dfd3D360C596D3F4aF6e5F9678",
    pool: "0x20a3d8510f2e1176E8Db4CeA9883a8287a9029Db",
    registry: "0x6f6C373d09C07425BaAE72317863d7F6bb731e37",
    ohm: "0x060cb087a9730E13aa191f31A6d86bFF8DfcdCC0",
    routes: ["mainnet", "arbitrum", "berachain", "optimism", "robinhood"],
  },
  berachain: {
    selector: 1294465214383781161n,
    bridge: "0xF35193DA8C10e44aF10853Ba5a3a1a6F7529E39a",
    pool: "0xEBDe552D851DD6Dfd3D360C596D3F4aF6e5F9678",
    registry: "0x0944C3Fb1dB7D165336569221995B31cBE6c8A55",
    ohm: "0x18878Df23e2a36f81e820e4b47b4A40576D3159C",
    routes: ["mainnet", "arbitrum", "base"],
  },
  optimism: {
    selector: 3734403246176062136n,
    bridge: "0xcb4E21Eb404d80F3e1dB781aAd9AD6A1217fbbf2",
    pool: "0xD98B5b2E4D5d6Cd554115DE19EfB7A9084BEddd1",
    registry: "0x657c42abE4CD8aa731Aec322f871B5b90cf6274F",
    ohm: "0x060cb087a9730E13aa191f31A6d86bFF8DfcdCC0",
    routes: ["mainnet", "arbitrum", "base"],
  },
  robinhood: {
    selector: 6180753054346818345n,
    bridge: "0x5261fBA7B50aA22B19B9edF939b771D109dE991F",
    pool: "0x5824850D8A6E46a473445a5AF214C7EbD46c5ECB",
    registry: "0x1912C3cFafE8A76A32a92861d815aC2837F237Ca",
    ohm: "0x9c859Dc91DB65bD7375660341231227336dAa134",
    routes: ["mainnet", "arbitrum", "base"],
  },
};

const ENV_NAMES: Record<ChainName, string> = {
  mainnet: "VITE_MAINNET_RPC_URL",
  arbitrum: "VITE_ARBITRUM_RPC_URL",
  base: "VITE_BASE_RPC_URL",
  berachain: "VITE_BERACHAIN_RPC_URL",
  optimism: "VITE_OPTIMISM_RPC_URL",
  robinhood: "VITE_ROBINHOOD_RPC_URL",
};

const adminAbi = parseAbi([
  "function owner() view returns (address)",
  "function isEnabled() view returns (bool)",
  "function enable(bytes)",
  "function setTrustedRemoteEVM(uint64, address)",
  "function setGasLimit(uint64, uint32)",
  "function getTrustedRemoteEVM(uint64) view returns ((address remoteAddress, bool isSet))",
  "function getGasLimit(uint64) view returns (uint32)",
  "function isSupportedChain(uint64) view returns (bool)",
  "function getPool(address) view returns (address)",
  "function getTokenConfig(address) view returns ((address administrator, address pendingAdministrator, address tokenPool))",
  "function setPool(address, address)",
  "function timelock() view returns (address)",
  "function getCurrentOutboundRateLimiterState(uint64) view returns ((uint128 tokens, uint32 lastUpdated, bool isEnabled, uint128 capacity, uint128 rate))",
  "function getCurrentInboundRateLimiterState(uint64) view returns ((uint128 tokens, uint32 lastUpdated, bool isEnabled, uint128 capacity, uint128 rate))",
]);

/** Parses `name=url,name=url`. Only the first `=` separates them, as a URL can hold more. */
export function parseRpcOverrides(value: string | undefined): Record<string, string> {
  return Object.fromEntries(
    (value ?? "")
      .split(",")
      .filter(Boolean)
      .map((pair) => {
        const separator = pair.indexOf("=");
        return [pair.slice(0, separator), pair.slice(separator + 1)];
      }),
  );
}

type Bucket = { capacity: bigint; rate: bigint };

/** The rate limiter config `CCIPTokenPoolConfig.disableChain` writes to contain a route. */
const isContained = ({ capacity, rate }: Bucket) => capacity === 2n && rate === 1n;

/** The same criteria as the frontend's `evaluateRoute`, for one end of a route. */
export function isRouteReady(reads: {
  bridgeEnabled: boolean;
  trustedRemote: { remoteAddress: Address; isSet: boolean };
  expectedRemote: Address;
  gasLimit: number;
  registeredPool: Address;
  expectedPool: Address;
  poolSupportsRemote: boolean;
  /** Undefined on the mainnet lock/release pool, which has no such function. */
  poolEnabled: boolean | undefined;
  outbound: Bucket;
  inbound: Bucket;
}): boolean {
  return (
    reads.bridgeEnabled &&
    reads.trustedRemote.isSet &&
    reads.trustedRemote.remoteAddress.toLowerCase() === reads.expectedRemote.toLowerCase() &&
    reads.gasLimit === GAS_LIMIT &&
    reads.registeredPool.toLowerCase() === reads.expectedPool.toLowerCase() &&
    reads.poolSupportsRemote &&
    reads.poolEnabled !== false &&
    !isContained(reads.outbound) &&
    !isContained(reads.inbound)
  );
}

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? undefined : process.argv[index + 1];
}

class Fork {
  readonly name: ChainName;
  readonly rpc: string;
  readonly client: PublicClient;

  constructor(name: ChainName, rpc: string) {
    this.name = name;
    this.rpc = rpc;
    this.client = createPublicClient({ transport: http(rpc, { timeout: 120_000 }) });
  }

  get config() {
    return CHAINS[this.name];
  }

  rpcCall(method: string, params: unknown[]) {
    // Anvil methods aren't in viem's typed schema.
    return (this.client.request as (args: unknown) => Promise<unknown>)({ method, params });
  }

  /** Sends from any address on the fork, impersonating it, and fails loudly on a revert. */
  async sendAs(from: Address, to: Address, data: Hex, label: string, value = 0n) {
    await this.rpcCall("anvil_impersonateAccount", [from]);
    await this.rpcCall("anvil_setBalance", [from, toHex(10n ** 20n)]);
    const hash = (await this.rpcCall("eth_sendTransaction", [
      { from, to, data, value: toHex(value), gas: toHex(15_000_000) },
    ])) as Hex;
    const receipt = await this.client.waitForTransactionReceipt({ hash, timeout: 120_000 });
    await this.rpcCall("anvil_stopImpersonatingAccount", [from]);
    if (receipt.status !== "success") {
      throw new Error(`[${this.name}] ${label} reverted (tx ${hash})`);
    }
  }

  /** Writes a token balance by finding the balances slot, as OHM has no public mint. */
  async setTokenBalance(token: Address, holder: Address, amount: bigint) {
    for (let slot = 0n; slot < 30n; slot++) {
      const key = keccak256(
        encodeAbiParameters([{ type: "address" }, { type: "uint256" }], [holder, slot]),
      );
      const original = (await this.rpcCall("eth_getStorageAt", [token, key, "latest"])) as Hex;
      await this.rpcCall("anvil_setStorageAt", [token, key, toHex(amount, { size: 32 })]);
      const balance = await this.client.readContract({
        address: token,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [holder],
      });
      if (balance === amount) return;
      await this.rpcCall("anvil_setStorageAt", [token, key, original]);
    }
    throw new Error(`[${this.name}] couldn't find the balances slot of ${token}`);
  }
}

async function replayProposal(fork: Fork) {
  const alreadyReplayed = await fork.client.readContract({
    address: fork.config.pool,
    abi: adminAbi,
    functionName: "isSupportedChain",
    args: [CHAINS.arbitrum.selector],
  });
  if (alreadyReplayed) return;

  const timelock = await fork.client.readContract({
    address: GOVERNOR,
    abi: adminAbi,
    functionName: "timelock",
  });

  const response = await fetch(`${INDEXER}/v1/governor/proposals/${PROPOSAL_ID}`);
  if (!response.ok) throw new Error(`Indexer error: ${response.status}`);
  const proposal = await response.json();
  const { targets, values, calldatas } = proposal.data ?? proposal;

  console.log(`[mainnet] replaying proposal ${PROPOSAL_ID}: ${targets.length} actions`);
  for (const [index, target] of (targets as Address[]).entries()) {
    await fork.sendAs(
      timelock,
      target,
      calldatas[index],
      `proposal action ${index + 1} (${target})`,
      BigInt(values[index]),
    );
  }
}

/** The runbook's finalize batch, run from whoever holds each role on the fork. */
async function finalizeL2(fork: Fork) {
  const { bridge, pool, registry, ohm } = fork.config;
  const owner = await fork.client.readContract({
    address: bridge,
    abi: adminAbi,
    functionName: "owner",
  });

  const poolEnabled = await fork.client.readContract({
    address: pool,
    abi: adminAbi,
    functionName: "isEnabled",
  });
  if (!poolEnabled) {
    await fork.sendAs(
      owner,
      pool,
      encodeFunctionData({ abi: adminAbi, functionName: "enable", args: ["0x"] }),
      "pool.enable",
    );
  }

  const { administrator } = await fork.client.readContract({
    address: registry,
    abi: adminAbi,
    functionName: "getTokenConfig",
    args: [ohm],
  });
  await fork.sendAs(
    administrator,
    registry,
    encodeFunctionData({ abi: adminAbi, functionName: "setPool", args: [ohm, pool] }),
    "registry.setPool",
  );
}

/** The runbook's periphery step: trust each remote bridge, set its gas limit, enable. */
async function configureBridge(fork: Fork) {
  const { bridge, routes } = fork.config;
  const owner = await fork.client.readContract({
    address: bridge,
    abi: adminAbi,
    functionName: "owner",
  });

  for (const remote of routes) {
    const { selector, bridge: remoteBridge } = CHAINS[remote];
    await fork.sendAs(
      owner,
      bridge,
      encodeFunctionData({
        abi: adminAbi,
        functionName: "setTrustedRemoteEVM",
        args: [selector, remoteBridge],
      }),
      `setTrustedRemoteEVM(${remote})`,
    );
    await fork.sendAs(
      owner,
      bridge,
      encodeFunctionData({
        abi: adminAbi,
        functionName: "setGasLimit",
        args: [selector, GAS_LIMIT],
      }),
      `setGasLimit(${remote})`,
    );
  }

  const enabled = await fork.client.readContract({
    address: bridge,
    abi: adminAbi,
    functionName: "isEnabled",
  });
  if (!enabled) {
    await fork.sendAs(
      owner,
      bridge,
      encodeFunctionData({ abi: adminAbi, functionName: "enable", args: ["0x"] }),
      "bridge.enable",
    );
  }
}

async function main() {
  const names = (arg("chains") ?? "mainnet,arbitrum,base").split(",") as ChainName[];
  const wallet = (arg("wallet") ?? ANVIL_ACCOUNT_0) as Address;
  const balance = parseUnits(arg("balance") ?? "5000", 9);
  const rpcOverrides = parseRpcOverrides(arg("rpc"));

  const forks = names.map(
    (name, index) => new Fork(name, rpcOverrides[name] ?? `http://localhost:${8545 + index}`),
  );

  for (const fork of forks) {
    if (fork.name === "mainnet") await replayProposal(fork);
    else await finalizeL2(fork);
    await configureBridge(fork);
    await fork.setTokenBalance(fork.config.ohm, wallet, balance);
    console.log(`[${fork.name}] ready`);
  }

  // Prove the end state with the same reads the frontend's route check makes.
  for (const fork of forks) {
    const { bridge, pool, registry, ohm } = fork.config;
    for (const other of forks) {
      if (other === fork) continue;
      const selector = other.config.selector;
      const read = <T>(address: Address, functionName: string, args: unknown[] = []) =>
        fork.client.readContract({
          address,
          abi: adminAbi,
          functionName,
          args,
        } as never) as Promise<T>;
      const [
        bridgeEnabled,
        trustedRemote,
        gasLimit,
        registeredPool,
        poolSupportsRemote,
        poolEnabled,
        outbound,
        inbound,
      ] = await Promise.all([
        read<boolean>(bridge, "isEnabled"),
        read<{ remoteAddress: Address; isSet: boolean }>(bridge, "getTrustedRemoteEVM", [selector]),
        read<number>(bridge, "getGasLimit", [selector]),
        read<Address>(registry, "getPool", [ohm]),
        read<boolean>(pool, "isSupportedChain", [selector]),
        fork.name === "mainnet" ? undefined : read<boolean>(pool, "isEnabled"),
        read<Bucket>(pool, "getCurrentOutboundRateLimiterState", [selector]),
        read<Bucket>(pool, "getCurrentInboundRateLimiterState", [selector]),
      ]);
      const ok = isRouteReady({
        bridgeEnabled,
        trustedRemote,
        expectedRemote: other.config.bridge,
        gasLimit,
        registeredPool,
        expectedPool: pool,
        poolSupportsRemote,
        poolEnabled,
        outbound,
        inbound,
      });
      console.log(`${fork.name} -> ${other.name}: ${ok ? "ok" : "NOT READY"}`);
      if (!ok) process.exitCode = 1;
    }
  }

  console.log("\nStart the frontend with:");
  for (const fork of forks) console.log(`${ENV_NAMES[fork.name]}=${fork.rpc}`);
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
