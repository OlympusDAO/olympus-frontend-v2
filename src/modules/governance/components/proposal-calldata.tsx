import { Fragment, useEffect, useState } from "react";
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
    <div data-slot="proposal-calldata" className="flex flex-col">
      {targets.map((target, index) => (
        <Fragment key={`${target}-${index}`}>
          {index > 0 && <hr className="my-6 border-a5-b" />}
          <CalldataAction
            index={index}
            target={target}
            signature={signatures[index] ?? ""}
            calldata={calldatas[index] ?? ""}
            value={values[index] ?? 0n}
          />
        </Fragment>
      ))}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 min-w-0">
      <span className="text-xs text-tertiary-t">{label}</span>
      {children}
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

  const displaySignature = decoded?.signature ?? signature;

  return (
    <div className="flex flex-col gap-4 min-w-0">
      <div className="flex items-center justify-between gap-4">
        <span className="text-2xl/[32px] font-semibold text-primary-t">Function {index + 1}</span>
        {value > 0n && (
          <span className="text-xs text-yellow-400">
            Value: {(Number(value) / 1e18).toFixed(4)} ETH
          </span>
        )}
      </div>

      <Field label="Target">
        <a
          href={`https://etherscan.io/address/${target}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-mono text-blue-400 hover:text-blue-300 break-all"
        >
          {target}
        </a>
      </Field>

      {isLoading ? (
        <Field label="Signature">
          <Skeleton className="h-4 w-64" />
        </Field>
      ) : displaySignature ? (
        <Field label="Signature">
          <span className="text-xs font-mono text-primary-t break-words">{displaySignature}</span>
        </Field>
      ) : null}

      {isLoading ? (
        <Field label="Decoded Parameters">
          <Skeleton className="h-16 w-full" />
        </Field>
      ) : decoded && decoded.params.length > 0 ? (
        <Field label="Decoded Parameters">
          <div className="rounded-lg bg-surface-a3 p-3 flex flex-col gap-1.5">
            {decoded.params.map((param, i) => (
              <div
                key={i}
                className="flex items-baseline gap-2 text-[11px] font-mono leading-relaxed"
              >
                <span className="text-secondary-t shrink-0">{param.type}:</span>
                <span className="text-primary-t break-all min-w-0 flex-1">{param.value}</span>
              </div>
            ))}
          </div>
        </Field>
      ) : null}

      {decodeFailed && calldata && calldata !== "0x" && (
        <Field label="Raw calldata">
          <div className="rounded-lg bg-surface-a3 p-3">
            <code className="text-[11px] font-mono text-primary-t break-all leading-relaxed">
              {calldata}
            </code>
          </div>
        </Field>
      )}
    </div>
  );
}
