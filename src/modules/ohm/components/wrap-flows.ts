import { TokenName } from "@/lib/tokens";

/** Tab on the Wrap page. */
export type WrapMode = "wrap" | "unwrap";

/**
 * A concrete conversion path on the Wrap page: the tab plus the selected source
 * token. Each flow maps to a distinct staking-contract call:
 * - wrap-ohm:      stake(to, amount, rebasing=false, claim=true)  OHM → gOHM
 * - wrap-sohm:     wrap(to, amount)                               sOHM → gOHM
 * - unwrap-gohm:   unstake(to, amount, trigger=false, rebasing=false)  gOHM → OHM
 * - unstake-sohm:  unstake(to, amount, trigger=false, rebasing=true)   sOHM → OHM (1:1)
 */
export type WrapFlow = "wrap-ohm" | "wrap-sohm" | "unwrap-gohm" | "unstake-sohm";

/** Selectable source tokens per tab. */
export const SOURCE_TOKENS: Record<WrapMode, TokenName[]> = {
  wrap: [TokenName.OHM, TokenName.SOHM],
  unwrap: [TokenName.GOHM, TokenName.SOHM],
};

export function defaultSourceToken(mode: WrapMode): TokenName {
  return mode === "wrap" ? TokenName.OHM : TokenName.GOHM;
}

export function getWrapFlow(mode: WrapMode, sourceToken: TokenName): WrapFlow {
  if (mode === "wrap") return sourceToken === TokenName.SOHM ? "wrap-sohm" : "wrap-ohm";
  return sourceToken === TokenName.SOHM ? "unstake-sohm" : "unwrap-gohm";
}

export const FLOW_INPUT_TOKEN: Record<WrapFlow, TokenName> = {
  "wrap-ohm": TokenName.OHM,
  "wrap-sohm": TokenName.SOHM,
  "unwrap-gohm": TokenName.GOHM,
  "unstake-sohm": TokenName.SOHM,
};

export const FLOW_OUTPUT_TOKEN: Record<WrapFlow, TokenName> = {
  "wrap-ohm": TokenName.GOHM,
  "wrap-sohm": TokenName.GOHM,
  "unwrap-gohm": TokenName.OHM,
  "unstake-sohm": TokenName.OHM,
};

/**
 * How the output amount is derived from the input amount:
 * index conversion for OHM/sOHM ↔ gOHM, identity for sOHM → OHM.
 */
export const FLOW_CONVERSION: Record<WrapFlow, "wrap" | "unwrap" | "identity"> = {
  "wrap-ohm": "wrap",
  "wrap-sohm": "wrap",
  "unwrap-gohm": "unwrap",
  "unstake-sohm": "identity",
};
