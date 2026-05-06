import { ConnectButton as RainbowConnectButton } from "@rainbow-me/rainbowkit";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/lib/hooks/use-mobile";
import { Icon } from "@/components/icon";
import { ChainIcon } from "@/components/chain-icon";

function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function ConnectButton() {
  const { isMobile } = useIsMobile();

  return (
    <RainbowConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        authenticationStatus,
        mounted,
      }) => {
        const ready = mounted && authenticationStatus !== "loading";
        const connected =
          ready &&
          account &&
          chain &&
          (!authenticationStatus || authenticationStatus === "authenticated");

        return (
          <div
            aria-hidden={!ready}
            className={!ready ? "opacity-0 pointer-events-none select-none" : undefined}
          >
            {(() => {
              if (!connected) {
                return (
                  <Button onClick={openConnectModal} type="button" size={isMobile ? "sm" : "md"}>
                    <Icon name="WalletIcon" size={16} />
                    {!isMobile && "Connect Wallet"}
                  </Button>
                );
              }
              if (chain.unsupported) {
                return (
                  <Button variant="secondary" onClick={openChainModal} type="button">
                    Wrong network
                  </Button>
                );
              }
              return (
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={openChainModal}
                    type="button"
                    size={isMobile ? "sm" : "md"}
                    aria-label={chain.name ?? "Switch network"}
                    className={isMobile ? "p-2" : "p-2.5"}
                  >
                    {chain.hasIcon && (
                      <ChainIcon chainId={chain.id} size={isMobile ? 16 : 20} rounded />
                    )}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={openAccountModal}
                    type="button"
                    size={isMobile ? "sm" : "md"}
                    className="px-3"
                  >
                    {isMobile ? (
                      <Icon name="WalletIcon" size={16} />
                    ) : (
                      shortenAddress(account.address)
                    )}
                  </Button>
                </div>
              );
            })()}
          </div>
        );
      }}
    </RainbowConnectButton.Custom>
  );
}
