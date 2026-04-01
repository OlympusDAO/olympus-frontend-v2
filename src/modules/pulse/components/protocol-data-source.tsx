export function ProtocolDataSource({ sources }: { sources: string[] }) {
  return <p className="mt-auto text-[10px] text-tertiary-t/60">Source: {sources.join(" · ")}</p>;
}
