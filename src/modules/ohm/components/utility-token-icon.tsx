import { Icon, type IconName } from "@/components/icon";

export function TokenIcon({
  symbol,
  iconName,
  className,
  size = 28,
}: {
  symbol: string;
  iconName: IconName | null;
  className?: string;
  size?: number;
}) {
  return (
    <div
      className={`rounded-full bg-surface-a10 flex items-center justify-center text-[10px] font-bold shrink-0 overflow-hidden ${className ?? ""}`}
      style={{ width: size, height: size }}
    >
      {iconName ? <Icon name={iconName} size={size} /> : symbol.slice(0, 2)}
    </div>
  );
}
