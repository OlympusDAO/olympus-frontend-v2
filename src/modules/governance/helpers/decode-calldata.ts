import { decodeFunctionData, type Hex, type Abi, type AbiFunction } from "viem";

export type DecodedCalldata = {
  functionName: string;
  signature: string;
  params: { type: string; value: string }[];
};

/**
 * Builds a minimal ABI from a function signature string like "transfer(address,uint256)".
 */
function buildAbiFromSignature(fnSig: string): Abi {
  // Parse "functionName(type1,type2)" into ABI format
  const match = fnSig.match(/^(\w+)\(([^)]*)\)$/);
  if (!match) throw new Error("Invalid signature");

  const [, name, paramsStr] = match;
  const paramTypes = paramsStr ? paramsStr.split(",").map((t) => t.trim()) : [];
  const inputs = paramTypes.map((type, i) => ({
    name: `arg${i}`,
    type,
  }));

  return [
    {
      type: "function" as const,
      // biome-ignore lint/style/noNonNullAssertion:  We know the regex ensures name is defined
      name: name!,
      inputs,
      outputs: [],
      stateMutability: "nonpayable" as const,
    },
  ];
}

/**
 * Attempts to decode calldata by looking up the function selector
 * in the OpenChain signature database, then decoding the params.
 *
 * Falls back to raw hex if decoding fails.
 */
export async function decodeCalldata(
  calldata: string,
  signature: string,
): Promise<DecodedCalldata | null> {
  if (!calldata || calldata === "0x") return null;

  // If we already have a signature from the proposal, try that first
  if (signature) {
    try {
      const abi = buildAbiFromSignature(signature);
      const decoded = decodeFunctionData({ abi, data: calldata as Hex });
      const fnDef = abi[0] as AbiFunction;
      const params = (fnDef.inputs || []).map((input, i) => ({
        type: input.type,
        value: String(decoded.args?.[i] ?? ""),
      }));
      return {
        functionName: decoded.functionName,
        signature,
        params,
      };
    } catch {
      // signature didn't work, fall through to selector lookup
    }
  }

  // Extract 4-byte function selector
  const selector = calldata.slice(0, 10);

  try {
    // Look up function signature from OpenChain
    const response = await fetch(
      `https://api.openchain.xyz/signature-database/v1/lookup?function=${selector}`,
    );
    if (!response.ok) throw new Error("OpenChain lookup failed");

    const data = await response.json();
    const results: string[] =
      data?.result?.function?.[selector]?.map((f: { name: string }) => f.name) ?? [];

    if (results.length === 0) {
      // Fallback to 4byte.directory
      const fallbackResponse = await fetch(
        `https://www.4byte.directory/api/v1/signatures/?hex_signature=${selector}`,
      );
      if (fallbackResponse.ok) {
        const fallbackData = await fallbackResponse.json();
        const fallbackResults: string[] =
          fallbackData?.results?.map((f: { text_signature: string }) => f.text_signature) ?? [];
        results.push(...fallbackResults);
      }
    }

    // Try each possible function signature until one decodes
    for (const fnSig of results) {
      try {
        const abi = buildAbiFromSignature(fnSig);
        const decoded = decodeFunctionData({ abi, data: calldata as Hex });
        const fnDef = abi[0] as AbiFunction;
        const params = (fnDef.inputs || []).map((input, i) => ({
          type: input.type,
          value: String(decoded.args?.[i] ?? ""),
        }));
        return {
          functionName: decoded.functionName,
          signature: fnSig,
          params,
        };
      } catch {}
    }
  } catch {
    // All decoding attempts failed
  }

  return null;
}
