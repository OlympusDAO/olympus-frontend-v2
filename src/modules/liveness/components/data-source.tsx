export function DataSource({ sources }: { sources: string[] }) {
  return <p className="mt-4 text-[10px] text-tertiary-t/60">Source: {sources.join(" · ")}</p>;
}
