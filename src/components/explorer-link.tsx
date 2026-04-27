import React from "react";

import { useChains } from "wagmi";

type ExplorerLinkProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  chainId: string | number;
};
export const ExplorerLink: React.FC<ExplorerLinkProps> = ({ chainId, href, ...props }) => {
  const chains = useChains();

  const chainsMap = React.useMemo(() => {
    return chains.reduce(
      (acc, chain) => {
        if (chain.blockExplorers?.default.url) {
          acc[chain.id] = chain.blockExplorers.default.url;
        }
        return acc;
      },
      {} as Record<string, string>,
    );
  }, [chains]);

  if (!chainsMap[chainId]) {
    return null;
  }

  const url = `${chainsMap[chainId]}${href}`.replace(/(?<!:)\/\/+/g, "/"); // remove double slashes
  return <a href={`${url}`} target="_blank" rel="noreferrer" {...props} />;
};
