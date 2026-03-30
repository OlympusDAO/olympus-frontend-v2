import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { decodeCalldata, type DecodedCalldata } from "@/modules/governance/helpers/decode-calldata";

/**
 * Displays the executable transaction data for a governance proposal.
 * Decodes calldata using function selector lookups (OpenChain / 4byte.directory).
 * Falls back to raw hex if decoding fails.
 */
export function ProposalCalldata({
  targets,
  signatures,
  calldatas,
  values,
}: {
  targets: string[];
  signatures: string[];
  calldatas: string[];
  values: bigint[];
}) {
  if (targets.length === 0) {
    return <p className="text-sm text-tertiary-t">No executable actions for this proposal.</p>;
  }

  return (
    <div data-slot="proposal-calldata" className="flex flex-col gap-3">
      {targets.map((target, index) => (
        <CalldataAction
          key={`${target}-${index}`}
          index={index}
          target={target}
          signature={signatures[index] ?? ""}
          calldata={calldatas[index] ?? ""}
          value={values[index] ?? 0n}
        />
      ))}
    </div>
  );
}

function CalldataAction({
  index,
  target,
  signature,
  calldata,
  value,
}: {
  index: number;
  target: string;
  signature: string;
  calldata: string;
  value: bigint;
}) {
  const [decoded, setDecoded] = useState<DecodedCalldata | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [decodeFailed, setDecodeFailed] = useState(false);

  useEffect(() => {
    if (!calldata || calldata === "0x") return;

    let cancelled = false;
    setIsLoading(true);

    decodeCalldata(calldata, signature).then((result) => {
      if (cancelled) return;
      setDecoded(result);
      setDecodeFailed(!result);
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [calldata, signature]);

  return (
    <Card className="p-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-secondary-t">Function {index + 1}</span>
          {value > 0n && (
            <span className="text-xs text-yellow-400">
              Value: {(Number(value) / 1e18).toFixed(4)} ETH
            </span>
          )}
        </div>

        {/* Decoded function info */}
        {isLoading ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        ) : decoded ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-start gap-2">
              <span className="text-xs text-tertiary-t shrink-0">Signature:</span>
              <span className="text-xs font-mono text-primary-t break-all">
                {decoded.signature}
              </span>
            </div>
            {decoded.params.length > 0 && (
              <div className="flex flex-col gap-1">
                <span className="text-xs text-tertiary-t">Decoded Parameters:</span>
                <div className="rounded-lg bg-surface-a3 p-2.5 overflow-x-auto">
                  {decoded.params.map((param, i) => (
                    <div key={i} className="flex gap-2 text-[11px] font-mono leading-relaxed">
                      <span className="text-secondary-t shrink-0 w-24">{param.type}:</span>
                      <span className="text-primary-t break-all">{param.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}

        {/* Raw calldata fallback */}
        {decodeFailed && calldata && calldata !== "0x" && (
          <div className="flex flex-col gap-1">
            <span className="text-xs text-yellow-400/80">Unable to decode calldata</span>
            <div className="rounded-lg bg-surface-a3 p-2.5 overflow-x-auto">
              <code className="text-[11px] font-mono text-primary-t break-all leading-relaxed">
                {calldata}
              </code>
            </div>
          </div>
        )}

        {/* Signature (from proposal, if no decoded one) */}
        {!decoded && signature && (
          <div className="flex items-start gap-2">
            <span className="text-xs text-tertiary-t shrink-0">Signature:</span>
            <span className="text-xs font-mono text-primary-t break-all">{signature}</span>
          </div>
        )}

        {/* Target address */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-tertiary-t shrink-0">Target:</span>
          <a
            href={`https://etherscan.io/address/${target}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-mono text-blue-400 hover:text-blue-300 truncate"
          >
            {target}
          </a>
        </div>
      </div>
    </Card>
  );
}
