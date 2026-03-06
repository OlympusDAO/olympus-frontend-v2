import { Tooltip } from "@/components/ui/tooltip";

import ethereumIcon from "@/icons/chains/ethereum.svg";
import arbitrumIcon from "@/icons/chains/arbitrum.svg";
import polygonIcon from "@/icons/chains/polygon.svg";
import optimismIcon from "@/icons/chains/optimism.svg";
import avalancheIcon from "@/icons/chains/avalanche.svg";
import bobaIcon from "@/icons/chains/boba.svg";
import fantomIcon from "@/icons/chains/fantom.svg";
import baseIcon from "@/icons/chains/base.svg";
import berachainIcon from "@/icons/chains/berachain.svg";

type ChainMeta = {
  label: string;
  icon: string;
};

const CHAIN_META: Record<number, ChainMeta> = {
  1: { label: "Ethereum", icon: ethereumIcon },
  42161: { label: "Arbitrum", icon: arbitrumIcon },
  137: { label: "Polygon", icon: polygonIcon },
  10: { label: "Optimism", icon: optimismIcon },
  43114: { label: "Avalanche", icon: avalancheIcon },
  288: { label: "Boba", icon: bobaIcon },
  250: { label: "Fantom", icon: fantomIcon },
  8453: { label: "Base", icon: baseIcon },
  80094: { label: "Berachain", icon: berachainIcon },
};

type ChainIconProps = {
  chainId: number;
  size?: number;
};

export function ChainIcon({ chainId, size = 20 }: ChainIconProps) {
  const meta = CHAIN_META[chainId];

  if (!meta) {
    return (
      <Tooltip title={`Chain ${chainId}`}>
        <div
          className="inline-flex shrink-0 items-center justify-center rounded-full bg-zinc-600"
          style={{ width: size, height: size }}
        >
          <span className="font-semibold leading-none text-white" style={{ fontSize: size * 0.5 }}>
            ?
          </span>
        </div>
      </Tooltip>
    );
  }

  return (
    <Tooltip title={meta.label}>
      <img
        alt={meta.label}
        src={meta.icon}
        width={size}
        height={size}
        className="shrink-0 rounded-full"
      />
    </Tooltip>
  );
}
