import { cn } from "@/lib/utils";

export function ProtocolDataSource({
  sources,
  className,
}: {
  sources: string[];
  className?: string;
}) {
  return (
    <p className={cn("mt-auto pt-4 text-[10px]/[14px] font-normal text-tertiary-t", className)}>
      Source: {sources.join(" · ")}
    </p>
  );
}
