import { Icon, type IconName } from "@/components/icon";

export function TokenIcon({
  symbol,
  iconName,
  className,
}: {
  symbol: string;
  iconName: IconName | null;
  className?: string;
}) {
  if (iconName) {
    return <Icon name={iconName} size={28} className={className} />;
  }
  return (
    <div
      className={`w-7 h-7 rounded-full bg-surface-a10 flex items-center justify-center text-[10px] font-bold shrink-0 ${className ?? ""}`}
    >
      {symbol.slice(0, 2)}
    </div>
  );
}
