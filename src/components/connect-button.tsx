import { ConnectButton as RainbowConnectButton } from "@rainbow-me/rainbowkit";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/lib/hooks/use-mobile";
import { UserIcon } from "lucide-react";

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
                  <Button
                    onClick={openConnectModal}
                    type="button"
                    size={isMobile ? "sm" : "md"}
                  >
                    {isMobile ? <UserIcon /> : "Connect Wallet"}
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
                <div className="flex gap-[3px]">
                  <Button
                    variant="secondary"
                    onClick={openChainModal}
                    type="button"
                    className="flex items-center"
                  >
                    {chain.hasIcon && (
                      <div
                        className="size-3 rounded-full overflow-hidden mr-1"
                        style={{ background: chain.iconBackground }}
                      >
                        {chain.iconUrl && (
                          <img
                            alt={chain.name ?? "Chain icon"}
                            src={chain.iconUrl}
                            className="size-full"
                          />
                        )}
                      </div>
                    )}
                    {chain.name}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={openAccountModal}
                    type="button"
                    size={isMobile ? "sm" : "md"}
                    className="px-3"
                  >
                    {isMobile ? <UserIcon /> : shortenAddress(account.address)}
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
