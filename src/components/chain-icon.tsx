import type { FC } from "react";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  arbitrum,
  avalanche,
  base,
  berachain,
  boba,
  fantom,
  mainnet,
  optimism,
  polygon,
  robinhood,
  sepolia,
} from "@/lib/chains";

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
import robinhoodIcon from "@/icons/chains/robinhood.png";

type ChainIconComponent = FC<{ width: number; height: number }>;

/** Robinhood ships a raster brand mark, so render it as an image instead of an SVG component. */
const RobinhoodIcon: ChainIconComponent = ({ width, height }) => (
  <img src={robinhoodIcon} alt="" width={width} height={height} />
);

type ChainMeta = {
  label: string;
  Icon: ChainIconComponent;
};

const CHAIN_META: Record<number, ChainMeta> = {
  [mainnet.id]: { label: mainnet.name, Icon: EthereumIcon },
  [sepolia.id]: { label: sepolia.name, Icon: SepoliaIcon },
  [arbitrum.id]: { label: arbitrum.name, Icon: ArbitrumIcon },
  [polygon.id]: { label: polygon.name, Icon: PolygonIcon },
  [optimism.id]: { label: optimism.name, Icon: OptimismIcon },
  [avalanche.id]: { label: avalanche.name, Icon: AvalancheIcon },
  [boba.id]: { label: boba.name, Icon: BobaIcon },
  [fantom.id]: { label: fantom.name, Icon: FantomIcon },
  [base.id]: { label: base.name, Icon: BaseIcon },
  [berachain.id]: { label: berachain.name, Icon: BerachainIcon },
  [robinhood.id]: { label: robinhood.name, Icon: RobinhoodIcon },
};

/** Display name for a chain ID, or undefined when the chain has no registry entry. */
export function getChainLabel(chainId: number): string | undefined {
  return CHAIN_META[chainId]?.label;
}

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
