export function ProtocolDataSource({ sources }: { sources: string[] }) {
  return (
    <p className="mt-auto pt-4 text-[10px]/[14px] font-normal text-tertiary-t">
      Source: {sources.join(" · ")}
    </p>
  );
}
