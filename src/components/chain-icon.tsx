import type { SVGProps, FC } from "react";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import EthereumIcon from "@/icons/chains/ethereum.svg?react";
import SepoliaIcon from "@/icons/chains/sepolia.svg?react";
import ArbitrumIcon from "@/icons/chains/arbitrum.svg?react";
import PolygonIcon from "@/icons/chains/polygon.svg?react";
import OptimismIcon from "@/icons/chains/optimism.svg?react";
import AvalancheIcon from "@/icons/chains/avalanche.svg?react";
import BobaIcon from "@/icons/chains/boba.svg?react";
import FantomIcon from "@/icons/chains/fantom.svg?react";
import BaseIcon from "@/icons/chains/base.svg?react";
import BerachainIcon from "@/icons/chains/berachain.svg?react";

type ChainMeta = {
  label: string;
  Icon: FC<SVGProps<SVGSVGElement>>;
};

const CHAIN_META: Record<number, ChainMeta> = {
  1: { label: "Ethereum", Icon: EthereumIcon },
  11155111: { label: "Sepolia", Icon: SepoliaIcon },
  42161: { label: "Arbitrum", Icon: ArbitrumIcon },
  137: { label: "Polygon", Icon: PolygonIcon },
  10: { label: "Optimism", Icon: OptimismIcon },
  43114: { label: "Avalanche", Icon: AvalancheIcon },
  288: { label: "Boba", Icon: BobaIcon },
  250: { label: "Fantom", Icon: FantomIcon },
  8453: { label: "Base", Icon: BaseIcon },
  80094: { label: "Berachain", Icon: BerachainIcon },
  // Testnets (reuse mainnet icons)
  421614: { label: "Arbitrum Sepolia", Icon: ArbitrumIcon },
  84532: { label: "Base Sepolia", Icon: BaseIcon },
};

type ChainIconProps = {
  chainId: number;
  size?: number;
  rounded?: boolean;
};

export function ChainIcon({ chainId, size = 20, rounded = false }: ChainIconProps) {
  const meta = CHAIN_META[chainId];

  if (!meta) {
    return (
      <Tooltip title={`Chain ${chainId}`}>
        <div
          className={cn(
            "inline-flex shrink-0 items-center justify-center bg-zinc-600",
            rounded ? "rounded-full" : "rounded-md",
          )}
          style={{ width: size, height: size }}
        >
          <span className="font-semibold leading-none text-white" style={{ fontSize: size * 0.5 }}>
            ?
          </span>
        </div>
      </Tooltip>
    );
  }

  const { Icon, label } = meta;
  return (
    <Tooltip title={label}>
      <span
        role="img"
        aria-label={label}
        className={cn("inline-flex shrink-0 overflow-hidden", rounded && "rounded-full")}
        style={{ width: size, height: size }}
      >
        <Icon width={size} height={size} />
      </span>
    </Tooltip>
  );
}
