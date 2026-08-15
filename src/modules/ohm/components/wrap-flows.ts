import { TOKENS, TokenName } from "@/lib/tokens";

/** Tab on the Wrap page. */
export type WrapMode = "wrap" | "unwrap";

/**
 * A concrete conversion path on the Wrap page: the tab plus the selected source
 * token. Each flow maps to a distinct staking-contract call (see useWrapFlowWrite):
 * - wrap-ohm:      stake(to, amount, rebasing=false, claim=true)        OHM → gOHM
 * - wrap-sohm:     wrap(to, amount)                                     sOHM → gOHM
 * - unwrap-gohm:   unstake(to, amount, trigger=false, rebasing=false)   gOHM → OHM
 * - unstake-sohm:  unstake(to, amount, trigger=false, rebasing=true)    sOHM → OHM (1:1)
 */
export type WrapFlow = "wrap-ohm" | "wrap-sohm" | "unwrap-gohm" | "unstake-sohm";

/** Selectable source tokens per tab. The output token is fixed per tab. */
export const SOURCE_TOKENS: Record<WrapMode, readonly TokenName[]> = {
  wrap: [TokenName.OHM, TokenName.SOHM],
  unwrap: [TokenName.GOHM, TokenName.SOHM],
};

export function defaultSourceToken(mode: WrapMode): TokenName {
  return mode === "wrap" ? TokenName.OHM : TokenName.GOHM;
}

/** Resolve a `?token=` query value (matched by symbol, e.g. "sOHM") to a valid source for the tab. */
export function parseSourceTokenParam(mode: WrapMode, value: string | null): TokenName | undefined {
  if (!value) return undefined;
  return SOURCE_TOKENS[mode].find(
    (name) => TOKENS[name].symbol.toLowerCase() === value.toLowerCase(),
  );
}

export function getWrapFlow(mode: WrapMode, sourceToken: TokenName): WrapFlow {
  if (mode === "wrap") return sourceToken === TokenName.SOHM ? "wrap-sohm" : "wrap-ohm";
  return sourceToken === TokenName.SOHM ? "unstake-sohm" : "unwrap-gohm";
}

type FlowSpec = {
  input: TokenName;
  output: TokenName;
  /** How the output amount is derived: gOHM-index conversion, or 1:1 identity. */
  conversion: "wrap" | "unwrap" | "identity";
  /** User-facing copy, shared by the form button, modal, and toasts. */
  copy: {
    /** Header of the amount input, e.g. "Wrap" / "Unstake". */
    inputLabel: string;
    /** Modal title, e.g. "Wrap sOHM". */
    title: string;
    /** Submit/execute button label, e.g. "Wrap sOHM to gOHM". */
    action: string;
    /** Approval step label, e.g. "Approve Wrapping". */
    approve: string;
  };
  /** Verb forms for transaction toasts. */
  toast: { progressive: string; past: string; noun: string };
  /** Analytics action slug. */
  analyticsAction: string;
};

export const WRAP_FLOWS: Record<WrapFlow, FlowSpec> = {
  "wrap-ohm": {
    input: TokenName.OHM,
    output: TokenName.GOHM,
    conversion: "wrap",
    copy: {
      inputLabel: "Wrap",
      title: "Wrap OHM",
      action: "Wrap OHM to gOHM",
      approve: "Approve Wrapping",
    },
    toast: { progressive: "Wrapping", past: "Wrapped", noun: "Wrap" },
    analyticsAction: "wrap",
  },
  "wrap-sohm": {
    input: TokenName.SOHM,
    output: TokenName.GOHM,
    conversion: "wrap",
    copy: {
      inputLabel: "Wrap",
      title: "Wrap sOHM",
      action: "Wrap sOHM to gOHM",
      approve: "Approve Wrapping",
    },
    toast: { progressive: "Wrapping", past: "Wrapped", noun: "Wrap" },
    analyticsAction: "wrap_sohm",
  },
  "unwrap-gohm": {
    input: TokenName.GOHM,
    output: TokenName.OHM,
    conversion: "unwrap",
    copy: {
      inputLabel: "Unwrap",
      title: "Unwrap gOHM",
      action: "Unwrap gOHM to OHM",
      approve: "Approve Unwrapping",
    },
    toast: { progressive: "Unwrapping", past: "Unwrapped", noun: "Unwrap" },
    analyticsAction: "unwrap",
  },
  "unstake-sohm": {
    input: TokenName.SOHM,
    output: TokenName.OHM,
    conversion: "identity",
    copy: {
      inputLabel: "Unstake",
      title: "Unstake sOHM",
      action: "Unstake sOHM to OHM",
      approve: "Approve Unstaking",
    },
    toast: { progressive: "Unstaking", past: "Unstaked", noun: "Unstake" },
    analyticsAction: "unstake_sohm",
  },
};
